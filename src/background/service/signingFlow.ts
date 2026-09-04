import { v4 as uuidv4 } from 'uuid';
import { ethErrors } from 'eth-rpc-errors';
import * as Sentry from '@sentry/browser';
import {
  AccountRef,
  ApprovalRef,
  SigningAttemptRef,
  SigningFlowRef,
  SigningRequestContext,
  asSigningAttemptId,
  asSigningFlowId,
  sameAccountRef,
} from '@/utils/signingTypes';
import {
  cancelSignComponentWaiting,
  emitSigningAttemptFinished,
} from '@/utils/signEvent';

export type SigningFlowStatus =
  | 'created'
  | 'awaiting-approval'
  | 'awaiting-ui'
  | 'signing'
  | 'awaiting-retry'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SigningAttemptStatus =
  | 'created'
  | 'awaiting-ui'
  | 'signing'
  | 'succeeded'
  | 'failed'
  | 'superseded'
  | 'cancelled';

type AttemptRunner<T> = (
  attempt: SigningAttemptRef,
  retryOptions?: unknown
) => Promise<T>;

type FlowRecord = {
  ref: SigningFlowRef;
  account?: AccountRef;
  origin: string;
  rpcRequestId: string;
  parentFlow?: SigningFlowRef;
  status: SigningFlowStatus;
  approvals: Set<string>;
  attempts: Map<string, AttemptRecord>;
  activeAttemptId?: string;
  owner?: Owner;
  onFinished?: (event: {
    attempt: SigningAttemptRef;
    success: boolean;
    data?: unknown;
    error?: unknown;
  }) => void;
};

type AttemptRecord = {
  ref: SigningAttemptRef;
  approval?: ApprovalRef;
  approvalId?: string;
  status: SigningAttemptStatus;
  awaitUi: boolean;
  uiReady: boolean;
  runner?: AttemptRunner<any>;
  retryable?: (error: unknown) => boolean;
  waiters: Array<{
    resolve: () => void;
    reject: (error: unknown) => void;
  }>;
};

type Owner = {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  settled: boolean;
};

const rejected = () => ethErrors.provider.userRejectedRequest();

const sameAttempt = (a: SigningAttemptRef, b: SigningAttemptRef) =>
  a.flowId === b.flowId && a.attemptId === b.attemptId;

/**
 * The only owner of a signing flow's execution identity.
 *
 * The service deliberately exposes state transitions instead of the maps
 * themselves. A late transport result can therefore only be accepted by
 * finishAttempt while its exact attempt is still active.
 */
export class SigningFlowService {
  private flows = new Map<string, FlowRecord>();

  createFlow(input: {
    flowId?: string;
    account?: AccountRef;
    origin: string;
    rpcRequestId: string;
    parentFlow?: SigningFlowRef;
  }): SigningFlowRef {
    const flowId = input.flowId || uuidv4();
    const existing = this.flows.get(flowId);
    if (existing && !this.isTerminal(existing.status)) {
      const sameAccount =
        (!existing.account && !input.account) ||
        (!!existing.account &&
          !!input.account &&
          sameAccountRef(existing.account, input.account));
      if (
        !sameAccount ||
        existing.origin !== input.origin ||
        existing.rpcRequestId !== input.rpcRequestId ||
        (!existing.parentFlow && !!input.parentFlow) ||
        (!!existing.parentFlow &&
          existing.parentFlow.flowId !== input.parentFlow?.flowId)
      ) {
        throw rejected();
      }
      return existing.ref;
    }
    const ref = { flowId: asSigningFlowId(flowId) };
    this.flows.set(flowId, {
      ref,
      account: input.account,
      origin: input.origin,
      rpcRequestId: input.rpcRequestId,
      parentFlow: input.parentFlow,
      status: 'awaiting-approval',
      approvals: new Set(),
      attempts: new Map(),
    });
    return ref;
  }

  startAttempt(input: {
    account: AccountRef;
    origin: string;
    rpcRequestId?: string;
    parentFlow?: SigningFlowRef;
  }): SigningRequestContext | undefined {
    const flow = this.createFlow({
      account: input.account,
      origin: input.origin,
      rpcRequestId: input.rpcRequestId || uuidv4(),
      parentFlow: input.parentFlow,
    });
    const attempt = this.createAttempt(flow, { awaitUi: false });
    if (!attempt || !this.beginAttempt(attempt)) {
      this.cancelFlow(flow);
      return;
    }
    const flowRecord = this.getFlow(flow);
    if (!flowRecord) return;
    return {
      flow,
      attempt,
      account: input.account,
      origin: flowRecord.origin,
      rpcRequestId: flowRecord.rpcRequestId,
      ...(input.parentFlow ? { parentFlow: input.parentFlow } : {}),
    };
  }

  createChildAttempt(input: {
    parent: SigningRequestContext;
    account: AccountRef;
    origin: string;
    approval?: ApprovalRef;
  }): SigningRequestContext | undefined {
    if (!this.isCurrentContext(input.parent)) return;
    const flow = this.createFlow({
      account: input.account,
      origin: input.origin,
      rpcRequestId: `${input.parent.rpcRequestId}:${uuidv4()}`,
      parentFlow: input.parent.flow,
    });
    const attempt = this.createAttempt(flow);
    if (!attempt) return;
    if (input.approval && !this.bindAttemptApproval(attempt, input.approval)) {
      this.cancelFlow(flow);
      return;
    }
    return {
      flow,
      attempt,
      account: input.account,
      origin: input.origin,
      rpcRequestId: this.getFlow(flow)!.rpcRequestId,
      parentFlow: input.parent.flow,
    };
  }

  isCurrentContext(context: SigningRequestContext) {
    const flow = this.getFlow(context.flow);
    return (
      !!flow &&
      context.flow.flowId === context.attempt.flowId &&
      this.isCurrentAttempt(context.attempt) &&
      sameAccountRef(flow.account, context.account) &&
      flow.origin === context.origin &&
      flow.rpcRequestId === context.rpcRequestId &&
      ((!flow.parentFlow && !context.parentFlow) ||
        flow.parentFlow?.flowId === context.parentFlow?.flowId)
    );
  }

  isActiveContext(context: SigningRequestContext) {
    return (
      this.isCurrentContext(context) && this.isActiveAttempt(context.attempt)
    );
  }

  finishAttemptWithEvent(
    context: SigningRequestContext,
    outcome: {
      success: boolean;
      data?: unknown;
      error?: unknown;
      retryable?: boolean;
    }
  ) {
    if (!this.isActiveContext(context)) {
      this.report('late-context-finish-discarded', context.attempt);
      return { accepted: false as const };
    }
    const finished = this.finishAttempt(context.attempt, outcome);
    if (!finished.accepted) return finished;
    emitSigningAttemptFinished({
      attempt: context.attempt,
      success: outcome.success,
      ...(outcome.success ? { data: outcome.data } : { error: outcome.error }),
    });
    const flow = this.getFlow(context.flow);
    if (flow) this.maybeCleanup(flow);
    return finished;
  }

  getFlow(flow: SigningFlowRef | string) {
    return this.flows.get(typeof flow === 'string' ? flow : flow.flowId);
  }

  isInFlowTree(
    flow: SigningFlowRef | string,
    ancestor: SigningFlowRef | string
  ) {
    const ancestorId =
      typeof ancestor === 'string' ? ancestor : ancestor.flowId;
    let current = this.getFlow(flow);
    while (current) {
      if (current.ref.flowId === ancestorId) return true;
      current = current.parentFlow
        ? this.getFlow(current.parentFlow)
        : undefined;
    }
    return false;
  }

  attachApproval(flow: SigningFlowRef, approval: ApprovalRef) {
    const record = this.flows.get(flow.flowId);
    if (!record || this.isTerminal(record.status)) return false;
    record.approvals.add(approval.approvalId);
    return true;
  }

  detachApproval(flow: SigningFlowRef, approval: ApprovalRef) {
    const record = this.flows.get(flow.flowId);
    const detached = !!record?.approvals.delete(approval.approvalId);
    if (record) this.maybeCleanup(record);
    return detached;
  }

  createAttempt(
    flow: SigningFlowRef,
    options: { attemptId?: string; awaitUi?: boolean; approvalId?: string } = {}
  ): SigningAttemptRef | undefined {
    const record = this.flows.get(flow.flowId);
    if (!record || this.isTerminal(record.status)) return;

    const previous = this.activeAttempt(record);
    if (previous && !this.isTerminalAttempt(previous.status)) {
      this.supersede(previous);
    }

    const attemptId = options.attemptId || uuidv4();
    const ref = {
      flowId: flow.flowId,
      attemptId: asSigningAttemptId(attemptId),
    };
    const attempt: AttemptRecord = {
      ref,
      approvalId: options.approvalId,
      status: options.awaitUi === false ? 'created' : 'awaiting-ui',
      awaitUi: options.awaitUi !== false,
      uiReady: options.awaitUi === false,
      waiters: [],
    };
    record.attempts.set(attemptId, attempt);
    record.activeAttemptId = attemptId;
    record.status = options.awaitUi === false ? 'created' : 'awaiting-ui';
    return ref;
  }

  getActiveAttempt(
    flow: SigningFlowRef | string
  ): SigningAttemptRef | undefined {
    const record = this.getFlow(flow);
    const attempt = record && this.activeAttempt(record);
    return attempt && !this.isTerminalAttempt(attempt.status)
      ? attempt.ref
      : undefined;
  }

  getAttempt(attempt: SigningAttemptRef) {
    const record = this.flows.get(attempt.flowId);
    return record?.attempts.get(attempt.attemptId);
  }

  bindAttemptApproval(attempt: SigningAttemptRef, approval: ApprovalRef) {
    const record = this.getAttempt(attempt);
    if (!record || !this.isCurrentAttempt(attempt)) return false;
    record.approval = approval;
    record.approvalId = approval.approvalId;
    return true;
  }

  getAttemptApproval(attempt: SigningAttemptRef) {
    return this.getAttempt(attempt)?.approval;
  }

  isAttemptValidForApproval(attempt: SigningAttemptRef, approvalId: string) {
    const record = this.getAttempt(attempt);
    const flow = this.flows.get(attempt.flowId);
    const current = flow && this.activeAttempt(flow);
    return (
      !!record &&
      !!flow &&
      flow.status !== 'cancelled' &&
      !!current &&
      sameAttempt(current.ref, attempt) &&
      record.approvalId === approvalId
    );
  }

  isActiveAttempt(attempt: SigningAttemptRef) {
    const record = this.flows.get(attempt.flowId);
    const current = record && this.activeAttempt(record);
    return (
      !!current &&
      sameAttempt(current.ref, attempt) &&
      current.status === 'signing'
    );
  }

  isCurrentAttempt(attempt: SigningAttemptRef) {
    const record = this.flows.get(attempt.flowId);
    const current = record && this.activeAttempt(record);
    return (
      !!current &&
      sameAttempt(current.ref, attempt) &&
      !this.isTerminalAttempt(current.status)
    );
  }

  registerRunner<T>(
    attempt: SigningAttemptRef,
    runner: AttemptRunner<T>,
    options: { retryable?: (error: unknown) => boolean } = {}
  ) {
    const record = this.getAttempt(attempt);
    if (!record || !this.isCurrentAttempt(attempt)) return false;
    record.runner = runner;
    record.retryable = options.retryable;
    return true;
  }

  waitForSigningUi(attempt: SigningAttemptRef): Promise<void> {
    const record = this.getAttempt(attempt);
    if (!record || !this.isCurrentAttempt(attempt))
      return Promise.reject(rejected());
    if (!record.awaitUi || record.uiReady) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      record.waiters.push({ resolve, reject });
    });
  }

  markUiReady(attempt: SigningAttemptRef) {
    const record = this.getAttempt(attempt);
    if (!record || !this.isCurrentAttempt(attempt)) {
      this.report('mismatched-ui-ready', attempt);
      return false;
    }
    if (record.status !== 'awaiting-ui' && record.status !== 'created') {
      this.report('invalid-state-transition', attempt, {
        status: record.status,
        transition: 'mark-ui-ready',
      });
      return false;
    }
    record.uiReady = true;
    record.waiters.splice(0).forEach(({ resolve }) => resolve());
    return true;
  }

  beginAttempt(attempt: SigningAttemptRef) {
    const record = this.getAttempt(attempt);
    if (
      !record ||
      !this.isCurrentAttempt(attempt) ||
      (!record.uiReady && record.awaitUi)
    ) {
      return false;
    }
    if (record.status !== 'created' && record.status !== 'awaiting-ui')
      return false;
    record.status = 'signing';
    const flow = this.flows.get(attempt.flowId)!;
    flow.status = 'signing';
    return true;
  }

  finishAttempt(
    attempt: SigningAttemptRef,
    outcome: { success: boolean; retryable?: boolean }
  ) {
    const record = this.getAttempt(attempt);
    const flow = this.flows.get(attempt.flowId);
    if (!record || !flow || !this.isActiveAttempt(attempt)) {
      this.report('late-result-discarded', attempt, {
        attemptStatus: record?.status,
        flowStatus: flow?.status,
      });
      return { accepted: false as const };
    }
    record.status = outcome.success ? 'succeeded' : 'failed';
    flow.status = outcome.success
      ? 'completed'
      : outcome.retryable
      ? 'awaiting-retry'
      : 'failed';
    return { accepted: true as const, status: record.status };
  }

  retrySigningAttempt(input: {
    flow: SigningFlowRef;
    currentAttempt: SigningAttemptRef;
    retryOptions?: unknown;
  }): SigningAttemptRef | undefined {
    const flow = this.flows.get(input.flow.flowId);
    const current = this.getAttempt(input.currentAttempt);
    if (
      !flow ||
      !current ||
      flow.activeAttemptId !== input.currentAttempt.attemptId ||
      current.status !== 'failed' ||
      flow.status !== 'awaiting-retry' ||
      !current.runner
    ) {
      this.report('stale-retry-command', input.currentAttempt, {
        flowId: input.flow.flowId,
        flowStatus: flow?.status,
        attemptStatus: current?.status,
      });
      return;
    }

    const next = this.createAttempt(input.flow, { awaitUi: true });
    if (!next) return;
    const nextRecord = this.getAttempt(next)!;
    nextRecord.approval = current.approval;
    nextRecord.approvalId = current.approvalId;
    nextRecord.runner = current.runner;
    nextRecord.retryable = current.retryable;
    void this.startRunner(next, input.retryOptions).catch(() => undefined);
    return next;
  }

  run<T>(
    flow: SigningFlowRef,
    attempt: SigningAttemptRef,
    runner: AttemptRunner<T>,
    options: {
      retryable?: (error: unknown) => boolean;
      onFinished?: (event: {
        attempt: SigningAttemptRef;
        success: boolean;
        data?: unknown;
        error?: unknown;
      }) => void;
    } = {}
  ): Promise<T> {
    const record = this.getAttempt(attempt);
    const flowRecord = this.flows.get(flow.flowId);
    if (!record || !flowRecord || !this.isCurrentAttempt(attempt)) {
      return Promise.reject(rejected());
    }
    if (!this.registerRunner(attempt, runner, options)) {
      this.report('invalid-state-transition', attempt, {
        transition: 'register-runner',
      });
      return Promise.reject(rejected());
    }
    flowRecord.onFinished = options.onFinished;
    if (!flowRecord.owner) {
      let resolve!: (value: unknown) => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<unknown>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      flowRecord.owner = { promise, resolve, reject, settled: false };
    }
    void this.startRunner(attempt).catch(() => undefined);
    return flowRecord.owner.promise as Promise<T>;
  }

  cancelFlow(flow: SigningFlowRef | string, reason = rejected()) {
    const record = this.getFlow(flow);
    if (!record || this.isTerminal(record.status)) return false;
    record.status = 'cancelled';
    record.attempts.forEach((attempt) => {
      if (!this.isTerminalAttempt(attempt.status)) {
        attempt.status = 'cancelled';
        cancelSignComponentWaiting(attempt.ref);
        attempt.waiters.splice(0).forEach(({ reject }) => reject(reason));
      }
    });
    this.resolveOwner(record, reason, false);
    record.approvals.clear();
    this.flows.forEach((child) => {
      if (child.parentFlow?.flowId === record.ref.flowId) {
        this.cancelFlow(child.ref, reason);
      }
    });
    this.maybeCleanup(record);
    return true;
  }

  cancelByApproval(approvalId: string, reason = rejected()) {
    let cancelled = false;
    this.flows.forEach((flow) => {
      if (flow.approvals.has(approvalId)) {
        cancelled = this.cancelFlow(flow.ref, reason) || cancelled;
      }
    });
    return cancelled;
  }

  cancelFlowsForAccount(account: AccountRef, reason = rejected()) {
    let cancelled = false;
    this.flows.forEach((flow) => {
      if (sameAccountRef(flow.account, account)) {
        cancelled = this.cancelFlow(flow.ref, reason) || cancelled;
      }
    });
    return cancelled;
  }

  cancelAll(reason = rejected()) {
    this.flows.forEach((flow) => this.cancelFlow(flow.ref, reason));
  }

  clear() {
    this.cancelAll();
    this.flows.clear();
  }

  private async startRunner(
    attempt: SigningAttemptRef,
    retryOptions?: unknown
  ) {
    const record = this.getAttempt(attempt);
    const flow = this.flows.get(attempt.flowId);
    if (!record || !flow || !record.runner) return;
    try {
      await this.waitForSigningUi(attempt);
      if (!this.beginAttempt(attempt)) return;
      const result = await record.runner(attempt, retryOptions);
      const finished = this.finishAttempt(attempt, { success: true });
      if (finished.accepted) {
        this.notifyFinished(flow, { attempt, success: true, data: result });
        this.resolveOwner(flow, result, true);
        this.maybeCleanup(flow);
      }
    } catch (error) {
      const retryable = record.retryable?.(error) || false;
      const finished = this.finishAttempt(attempt, {
        success: false,
        retryable,
      });
      if (finished.accepted) {
        this.notifyFinished(flow, { attempt, success: false, error });
        if (!retryable) this.resolveOwner(flow, error, false);
        this.maybeCleanup(flow);
      }
    }
  }

  private activeAttempt(flow: FlowRecord) {
    return flow.activeAttemptId
      ? flow.attempts.get(flow.activeAttemptId)
      : undefined;
  }

  private supersede(attempt: AttemptRecord) {
    attempt.status = 'superseded';
    cancelSignComponentWaiting(attempt.ref);
    attempt.waiters.splice(0).forEach(({ reject }) => reject(rejected()));
  }

  private isTerminal(status: SigningFlowStatus) {
    return ['completed', 'failed', 'cancelled'].includes(status);
  }

  private isTerminalAttempt(status: SigningAttemptStatus) {
    return ['succeeded', 'failed', 'superseded', 'cancelled'].includes(status);
  }

  private notifyFinished(
    flow: FlowRecord,
    event: {
      attempt: SigningAttemptRef;
      success: boolean;
      data?: unknown;
      error?: unknown;
    }
  ) {
    try {
      flow.onFinished?.(event);
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  private maybeCleanup(flow: FlowRecord) {
    if (
      this.isTerminal(flow.status) &&
      flow.approvals.size === 0 &&
      (!flow.owner || flow.owner.settled)
    ) {
      this.flows.delete(flow.ref.flowId);
    }
  }

  private report(
    message: string,
    attempt?: SigningAttemptRef,
    data?: Record<string, unknown>
  ) {
    Sentry.addBreadcrumb({
      category: 'signing-flow',
      level: 'warning',
      message,
      data: {
        ...data,
        flowId: attempt?.flowId,
        attemptId: attempt?.attemptId,
      },
    });
  }

  private resolveOwner(flow: FlowRecord, value: unknown, success: boolean) {
    if (!flow.owner || flow.owner.settled) return;
    if (success) flow.owner.resolve(value);
    else flow.owner.reject(value);
    flow.owner.settled = true;
  }
}

export const signingFlowService = new SigningFlowService();
