import browser, { Windows } from 'webextension-polyfill';
import Events from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/browser';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';
import {
  KEYRING_CATEGORY_MAP,
  IS_LINUX,
  IS_VIVALDI,
  IS_CHROME,
  KEYRING_CATEGORY,
  IS_WINDOWS,
} from 'consts';
import transactionHistoryService from './transactionHistory';
import preferenceService, { Account } from './preference';
import stats from '@/stats';
import { findChain } from '@/utils/chain';
import { isManifestV3 } from '@/utils/env';
import {
  ApprovalRef,
  InternalSignRequestId,
  SigningAttemptRef,
  SigningFlowRef,
  SigningRequestContext,
  sameAccountRef,
  toAccountRef,
  toApprovalRef,
} from '@/utils/signingTypes';
import { signingFlowService } from './signingFlow';

type IApprovalComponents = typeof import('@/ui/views/Approval/components');
type IApprovalComponent = IApprovalComponents[keyof IApprovalComponents];

type InternalSignWaiter = {
  id: InternalSignRequestId;
  attempt?: SigningAttemptRef;
  request: { method: string; params?: any };
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type ApprovalWaiter = {
  resolve: (
    approval: ApprovalRef<Approval['data']['approvalComponent']>
  ) => void;
  reject: (error: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export interface Approval {
  id: string;
  taskId: number | null;
  signingTxId?: string;
  data: {
    params?: import('react').ComponentProps<IApprovalComponent>['params'];
    account: Account;
    origin?: string;
    approvalComponent: keyof IApprovalComponents;
    approvalType?: string;
    internalSignRequestId?: InternalSignRequestId;
    signing?: {
      flow: SigningFlowRef;
      attempt: SigningAttemptRef;
    };
  };
  winProps: any;
  resolve?(params?: any): void;
  reject?(err: EthereumProviderError<any>): void;
}

export type ResolveApprovalCommand = {
  approval: ApprovalRef<Approval['data']['approvalComponent']>;
  data?: any;
  forceReject?: boolean;
  signing?: { attempt: SigningAttemptRef };
};

export type RejectApprovalCommand = {
  approval: ApprovalRef<Approval['data']['approvalComponent']>;
  error?: string;
  stay?: boolean;
  isInternal?: boolean;
  signing?: { attempt: SigningAttemptRef };
};

export type ApprovalActionResult =
  | { accepted: true }
  | {
      accepted: false;
      reason:
        | 'NO_CURRENT_APPROVAL'
        | 'APPROVAL_ID_MISMATCH'
        | 'APPROVAL_COMPONENT_MISMATCH'
        | 'SIGNING_ATTEMPT_MISMATCH';
    };

const QUEUE_APPROVAL_COMPONENTS_WHITELIST = [
  'Unlock',
  'SignTx',
  'SignText',
  'SignTypedData',
  'LedgerHardwareWaiting',
  'QRHardWareWaiting',
  'WatchAddressWaiting',
  'CommonWaiting',
  'PrivatekeyWaiting',
  'CoinbaseWaiting',
  'ImKeyHardwareWaiting',
];

export type StatsData = {
  signed: boolean;
  signedSuccess: boolean;
  submit: boolean;
  submitSuccess: boolean;
  type: string;
  chainId: string;
  category: KEYRING_CATEGORY;
  preExecSuccess: boolean;
  createdBy: string;
  source: any;
  trigger: any;
  reported: boolean;
  signMethod?: string;
  networkType?: string;
};

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
  currentApproval: Approval | null = null;
  dappManager = new Map<
    string,
    {
      lastRejectTimestamp: number;
      lastRejectCount: number;
      blockedTimestamp: number;
      isBlocked: boolean;
    }
  >();
  _approvals: Approval[] = [];
  notifiWindowId: null | number = null;
  isLocked = false;
  statsData: StatsData | undefined;
  private internalSignWaiters = new Map<
    InternalSignRequestId,
    InternalSignWaiter
  >();
  private approvalWaiters = new Map<InternalSignRequestId, ApprovalWaiter>();

  get approvals() {
    return this._approvals;
  }

  set approvals(val: Approval[]) {
    this._approvals = val;
    const action = isManifestV3 ? browser.action : browser.browserAction;

    if (val.length <= 0) {
      action.setBadgeText({
        text: isManifestV3 ? '' : null,
      });
    } else {
      action.setBadgeText({
        text: val.length + '',
      });
      action.setBadgeBackgroundColor({
        color: '#FE815F',
      });
    }
  }

  constructor() {
    super();

    winMgr.event.on('closeNotification', () => {
      this.notifiWindowId = null;
    });

    winMgr.event.on(
      'windowRemoved',
      (winId: number, isManuallyClosed: boolean) => {
        if (winId === this.notifiWindowId) {
          this.notifiWindowId = null;
          if (isManuallyClosed) {
            this.rejectAllApprovals();
          }
        }
      }
    );

    winMgr.event.on('windowFocusChange', (winId: number) => {
      if (IS_VIVALDI || IS_LINUX) return;
      if (IS_CHROME && winId === browser.windows.WINDOW_ID_NONE && IS_WINDOWS) {
        // When sign on Linux or Windows, will focus on -1 first then focus on sign window
        return;
      }

      if (this.notifiWindowId !== null && winId !== this.notifiWindowId) {
        const approval = this.currentApproval;
        if (
          approval &&
          !QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(
            approval.data.approvalComponent
          )
        ) {
          void this.rejectApprovalFor({
            approval: toApprovalRef(
              approval.id,
              approval.data.approvalComponent
            ),
          });
        }
      }
    });
  }

  activeFirstApproval = async () => {
    try {
      const windows = await browser.windows.getAll();
      const existWindow = windows.find(
        (window) => window.id === this.notifiWindowId
      );
      if (this.notifiWindowId !== null && !!existWindow) {
        browser.windows.update(this.notifiWindowId, {
          focused: true,
        });
        return;
      }

      if (this.approvals.length <= 0) return;

      const approval = this.approvals[0];
      this.currentApproval = approval;
      this.openNotification(approval.winProps, true);
    } catch (e) {
      Sentry.captureException(e, {
        tags: { function: 'activeFirstApproval' },
      });
      this.clear();
    }
  };

  deleteApproval = (approval) => {
    if (approval && this.approvals.length > 1) {
      this.approvals = this.approvals.filter((item) => approval.id !== item.id);
    } else {
      this.currentApproval = null;
      this.approvals = [];
    }
  };

  getCurrentApproval = () => this.currentApproval;

  isApprovalCurrent = (approvalId?: string) =>
    !!approvalId && this.currentApproval?.id === approvalId;

  isApprovalRefCurrent = (approval?: ApprovalRef) =>
    !!approval &&
    this.currentApproval?.id === approval.approvalId &&
    this.currentApproval.data.approvalComponent === approval.component;

  getSigningRequestContext = (
    approval?: ApprovalRef,
    account?: Account
  ): SigningRequestContext | undefined => {
    if (!this.isApprovalRefCurrent(approval)) return;
    const current = this.currentApproval!;
    const signing = current.data.signing;
    const approvalAccount = toAccountRef(current.data.account);
    const requestedAccount = toAccountRef(account);
    if (!signing || !approvalAccount) return;
    const flow = signingFlowService.getFlow(signing.flow);
    if (
      !flow ||
      !flow.account ||
      !sameAccountRef(flow.account, approvalAccount) ||
      (requestedAccount && !sameAccountRef(flow.account, requestedAccount)) ||
      !signingFlowService.isCurrentAttempt(signing.attempt)
    ) {
      return;
    }
    return {
      flow: signing.flow,
      attempt: signing.attempt,
      account: flow.account,
      origin: flow.origin,
      rpcRequestId: flow.rpcRequestId,
      parentFlow: flow.parentFlow,
    };
  };

  requestInternalPersonalSign = ({
    requestId,
    attempt,
    request,
  }: {
    requestId: InternalSignRequestId;
    attempt?: SigningAttemptRef;
    request: { method: string; params?: any };
  }): Promise<string> => {
    if (attempt && !signingFlowService.isCurrentAttempt(attempt)) {
      return Promise.reject(ethErrors.provider.userRejectedRequest());
    }
    if (this.internalSignWaiters.has(requestId)) {
      return Promise.reject(ethErrors.provider.userRejectedRequest());
    }

    let timeout: ReturnType<typeof setTimeout>;
    const promise = new Promise<string>((resolve, reject) => {
      timeout = setTimeout(() => {
        this.settleInternalSignRequest(
          requestId,
          false,
          ethErrors.provider.userRejectedRequest()
        );
      }, 30_000);
      this.internalSignWaiters.set(requestId, {
        id: requestId,
        attempt,
        request,
        resolve,
        reject,
        timeout,
      });
    });
    const ownedPromise = promise.finally(() => {
      const waiter = this.internalSignWaiters.get(requestId);
      if (waiter) {
        clearTimeout(waiter.timeout);
        this.internalSignWaiters.delete(requestId);
      }
    });
    void ownedPromise.catch(() => undefined);
    return ownedPromise;
  };

  settleInternalSignRequest = (
    requestId: InternalSignRequestId,
    success: boolean,
    value: unknown
  ) => {
    const waiter = this.internalSignWaiters.get(requestId);
    if (!waiter) return false;
    this.internalSignWaiters.delete(requestId);
    clearTimeout(waiter.timeout);
    if (success) waiter.resolve(String(value));
    else waiter.reject(value);
    return true;
  };

  waitForApproval = (
    requestId: InternalSignRequestId
  ): Promise<ApprovalRef<Approval['data']['approvalComponent']>> => {
    const existing = this.approvals.find(
      (approval) => approval.data.internalSignRequestId === requestId
    );
    if (existing) {
      return Promise.resolve(
        toApprovalRef(existing.id, existing.data.approvalComponent)
      );
    }
    if (this.approvalWaiters.has(requestId)) {
      const rejected = Promise.reject<
        ApprovalRef<Approval['data']['approvalComponent']>
      >(ethErrors.provider.userRejectedRequest());
      void rejected.catch(() => undefined);
      return rejected;
    }

    return new Promise<ApprovalRef<Approval['data']['approvalComponent']>>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          this.approvalWaiters.delete(requestId);
          reject(ethErrors.provider.userRejectedRequest());
        }, 30_000);
        this.approvalWaiters.set(requestId, { resolve, reject, timeout });
      }
    );
  };

  private notifyApprovalCreated = (approval: Approval) => {
    const requestId = approval.data.internalSignRequestId;
    if (!requestId) return;
    const waiter = this.approvalWaiters.get(requestId);
    if (!waiter) return;
    this.approvalWaiters.delete(requestId);
    clearTimeout(waiter.timeout);
    waiter.resolve(toApprovalRef(approval.id, approval.data.approvalComponent));
  };

  private rejectApprovalWaiters = () => {
    for (const requestId of this.approvalWaiters.keys()) {
      this.cancelApprovalWaiter(requestId);
    }
  };

  cancelApprovalWaiter = (
    requestId: InternalSignRequestId,
    error = ethErrors.provider.userRejectedRequest()
  ) => {
    const waiter = this.approvalWaiters.get(requestId);
    if (!waiter) return false;
    this.approvalWaiters.delete(requestId);
    clearTimeout(waiter.timeout);
    waiter.reject(error);
    return true;
  };

  private settleInternalSignWaiter = (
    approval: Approval,
    success: boolean,
    value: unknown
  ) => {
    const requestId = approval.data.internalSignRequestId;
    if (requestId) {
      this.settleInternalSignRequest(requestId, success, value);
      return;
    }

    const attempt = approval.data.signing?.attempt;
    if (!attempt) return;
    const matching = [...this.internalSignWaiters.values()].filter(
      (waiter) =>
        waiter.attempt?.flowId === attempt.flowId &&
        waiter.attempt?.attemptId === attempt.attemptId
    );
    if (matching.length !== 1) {
      if (matching.length > 1) {
        Sentry.addBreadcrumb({
          category: 'approval',
          level: 'warning',
          message: 'internal personal_sign result has ambiguous attempt',
          data: { flowId: attempt.flowId, attemptId: attempt.attemptId },
        });
      }
      return;
    }
    this.settleInternalSignRequest(matching[0].id, success, value);
  };

  private rejectInternalSignWaiters = (flowId?: string) => {
    for (const [id, waiter] of this.internalSignWaiters) {
      if (
        !flowId ||
        (waiter.attempt &&
          signingFlowService.isInFlowTree(waiter.attempt.flowId, flowId))
      ) {
        this.settleInternalSignRequest(
          id,
          false,
          ethErrors.provider.userRejectedRequest()
        );
      }
    }
  };

  private ensureSigningFlow = (
    flowId: string,
    account?: Account,
    origin?: string
  ) => {
    const existing = signingFlowService.getFlow(flowId);
    const requestedAccount = toAccountRef(account);
    if (
      existing &&
      ((existing.account &&
        requestedAccount &&
        !sameAccountRef(existing.account, requestedAccount)) ||
        existing.origin !== (origin || ''))
    ) {
      throw ethErrors.provider.userRejectedRequest();
    }
    return signingFlowService.createFlow({
      flowId,
      account: requestedAccount || existing?.account,
      origin: origin || existing?.origin || '',
      rpcRequestId: existing?.rpcRequestId || flowId,
      parentFlow: existing?.parentFlow,
    });
  };

  invalidateSigningFlow = (flowId?: string) => {
    if (!flowId) return false;
    this.rejectInternalSignWaiters(flowId);
    return signingFlowService.cancelFlow(flowId);
  };

  invalidateAllSigningFlows = () => {
    this.rejectInternalSignWaiters();
    signingFlowService.cancelAll();
  };

  updateSigningAttempt = (
    approval: ApprovalRef,
    attempt: SigningAttemptRef
  ) => {
    const current = this.currentApproval;
    if (
      !current ||
      !this.isApprovalRefCurrent(approval) ||
      !signingFlowService.isAttemptValidForApproval(attempt, current.id)
    ) {
      return false;
    }
    current.data.signing = {
      flow: { flowId: attempt.flowId },
      attempt,
    };
    return true;
  };

  private reportDroppedApproval = (
    operation: 'resolve' | 'reject',
    approval?: ApprovalRef
  ): ApprovalActionResult => {
    const currentApproval = this.currentApproval;
    const detail = {
      operation,
      requestedApprovalId: approval?.approvalId,
      requestedApprovalComponent: approval?.component,
      currentApprovalId: currentApproval?.id,
      currentComponent: currentApproval?.data.approvalComponent,
    };

    Sentry.addBreadcrumb({
      category: 'approval',
      level: 'warning',
      message: `${operation}ApprovalFor dropped`,
      data: detail,
    });

    if (!approval) {
      Sentry.captureException(
        new Error(
          `${operation}ApprovalFor called without an approvalId or approvalComponent`
        ),
        { tags: { function: `${operation}ApprovalFor` }, extra: detail }
      );
    }

    if (
      currentApproval &&
      approval &&
      currentApproval.data.approvalComponent !== approval.component
    ) {
      return { accepted: false, reason: 'APPROVAL_COMPONENT_MISMATCH' };
    }

    return currentApproval
      ? { accepted: false, reason: 'APPROVAL_ID_MISMATCH' }
      : { accepted: false, reason: 'NO_CURRENT_APPROVAL' };
  };

  private reportDroppedSigningAttempt = (
    attempt: SigningAttemptRef
  ): ApprovalActionResult => {
    Sentry.addBreadcrumb({
      category: 'approval',
      level: 'warning',
      message: 'resolveApprovalFor dropped stale signing attempt',
      data: {
        flowId: attempt.flowId,
        attemptId: attempt.attemptId,
        currentApprovalId: this.currentApproval?.id,
        currentFlowId: this.currentApproval?.data.signing?.flow.flowId,
      },
    });
    return { accepted: false, reason: 'SIGNING_ATTEMPT_MISMATCH' };
  };

  resolveApprovalFor = async ({
    approval: approvalRef,
    data,
    forceReject = false,
    signing,
  }: ResolveApprovalCommand): Promise<ApprovalActionResult> => {
    const currentApproval = this.currentApproval;
    const signingFlow = currentApproval?.data.signing?.flow;
    if (
      !currentApproval ||
      currentApproval.id !== approvalRef.approvalId ||
      currentApproval.data.approvalComponent !== approvalRef.component
    ) {
      return this.reportDroppedApproval('resolve', approvalRef);
    }
    if (
      signing &&
      !signingFlowService.isAttemptValidForApproval(
        signing.attempt,
        currentApproval.id
      )
    ) {
      return this.reportDroppedSigningAttempt(signing.attempt);
    }

    if (forceReject) {
      currentApproval.reject?.(new EthereumProviderError(4001, 'User Cancel'));
      this.settleInternalSignWaiter(
        currentApproval,
        false,
        ethErrors.provider.userRejectedRequest()
      );
    } else {
      currentApproval.resolve?.(data);
      this.settleInternalSignWaiter(currentApproval, true, data);
    }

    this.clearLastRejectDapp();
    if (signingFlow) {
      signingFlowService.detachApproval(signingFlow, approvalRef);
    }
    this.deleteApproval(currentApproval);
    this.currentApproval = this.approvals[0] || null;
    const isSigningApproval = ['SignTx', 'SignText', 'SignTypedData'].includes(
      currentApproval.data.approvalComponent
    );
    if (forceReject || (!data?.uiRequestComponent && !isSigningApproval)) {
      this.invalidateSigningFlow(currentApproval.data.signing?.flow.flowId);
    }
    return { accepted: true };
  };

  rejectApprovalFor = async ({
    approval: approvalRef,
    error,
    stay = false,
    isInternal = false,
    signing,
  }: RejectApprovalCommand): Promise<ApprovalActionResult> => {
    const approval = this.currentApproval;
    const signingFlow = approval?.data.signing?.flow;
    if (
      !approval ||
      approval.id !== approvalRef.approvalId ||
      approval.data.approvalComponent !== approvalRef.component
    ) {
      return this.reportDroppedApproval('reject', approvalRef);
    }

    if (
      signing &&
      !signingFlowService.isAttemptValidForApproval(
        signing.attempt,
        approval.id
      )
    ) {
      return this.reportDroppedSigningAttempt(signing.attempt);
    }

    this.addLastRejectDapp();
    this.invalidateSigningFlow(approval.data.signing?.flow.flowId);
    if (signingFlow) {
      signingFlowService.detachApproval(signingFlow, approvalRef);
    }
    if (isInternal) {
      approval.reject?.(ethErrors.rpc.internal(error));
    } else {
      approval.reject?.(ethErrors.provider.userRejectedRequest<any>(error));
    }
    this.settleInternalSignWaiter(
      approval,
      false,
      ethErrors.provider.userRejectedRequest<any>(error)
    );

    if (approval.signingTxId) {
      transactionHistoryService.removeSigningTx(approval.signingTxId);
    }

    if (this.approvals.length > 1) {
      this.deleteApproval(approval);
      this.currentApproval = this.approvals[0];
    } else {
      await this.clear(stay);
    }
    return { accepted: true };
  };

  requestApproval = async (
    data,
    winProps?,
    options?: {
      onCurrent?: () => void;
      parentApproval?: ApprovalRef;
      signing?: {
        flow: SigningFlowRef;
        attempt?: SigningAttemptRef;
      };
    }
  ): Promise<any> => {
    const origin = this.getOrigin(data);
    if (origin) {
      const dapp = this.dappManager.get(origin);
      // is blocked and less 1 min
      if (
        dapp?.isBlocked &&
        Date.now() - dapp.blockedTimestamp < 60 * 1000 * 1
      ) {
        throw ethErrors.provider.userRejectedRequest(
          'User rejected the request.'
        );
      }
    }
    const currentAccount =
      data.account || preferenceService.getCurrentAccount();
    const reportExplain = (signingTxId?: string) => {
      const signingTx = signingTxId
        ? transactionHistoryService.getSigningTx(signingTxId)
        : null;
      const explain = signingTx?.explain;

      const chain = findChain({
        id: signingTx?.rawTx.chainId,
      });

      if ((explain || chain?.isTestnet) && currentAccount) {
        stats.report('preExecTransaction', {
          type: currentAccount.brandName,
          category: KEYRING_CATEGORY_MAP[currentAccount.type],
          chainId: chain?.serverId || '',
          success: explain
            ? explain.calcSuccess && explain.pre_exec.success
            : true,
          createdBy: data?.params.$ctx?.ga ? 'rabby' : 'dapp',
          source: data?.params.$ctx?.ga?.source || '',
          trigger: data?.params.$ctx?.ga?.trigger || '',
          networkType: chain?.isTestnet
            ? 'Custom Network'
            : 'Integrated Network',
        });
      }
    };
    return new Promise((resolve, reject) => {
      const uuid = uuidv4();
      let signingTxId;
      if (data.approvalComponent === 'SignTx') {
        signingTxId = transactionHistoryService.addSigningTx(
          data.params.data[0]
        );
      } else {
        signingTxId = data?.params?.signingTxId;
      }

      const approval: Approval = {
        taskId: uuid as any,
        id: uuid,
        signingTxId,
        data,
        winProps,
        resolve(data) {
          if (this.data.approvalComponent === 'SignTx') {
            reportExplain(this.signingTxId);
          }
          resolve(data);
        },
        reject(data) {
          if (this.data.approvalComponent === 'SignTx') {
            reportExplain(this.signingTxId);
          }
          reject(data);
        },
      };

      const isExplicitHandoff =
        !!options?.parentApproval &&
        !!data.isUnshift &&
        this.isApprovalRefCurrent(options.parentApproval);
      if (
        !isExplicitHandoff &&
        !QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(data.approvalComponent)
      ) {
        if (this.currentApproval) {
          throw ethErrors.provider.userRejectedRequest(
            'please request after current approval resolve'
          );
        }
      } else {
        if (
          !isExplicitHandoff &&
          this.currentApproval &&
          !QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(
            this.currentApproval.data.approvalComponent
          )
        ) {
          throw ethErrors.provider.userRejectedRequest(
            'please request after current approval resolve'
          );
        }
      }

      let signingFlow: SigningFlowRef | undefined;
      let signingAttempt: SigningAttemptRef | undefined;
      if (options?.signing?.flow) {
        signingFlow = this.ensureSigningFlow(
          options.signing.flow.flowId,
          data.account,
          data.origin
        );
        const activeAttempt = signingFlowService.getActiveAttempt(signingFlow);
        if (options.signing.attempt) {
          if (
            options.signing.attempt.flowId !== signingFlow.flowId ||
            !activeAttempt ||
            activeAttempt.attemptId !== options.signing.attempt.attemptId ||
            !signingFlowService.isCurrentAttempt(options.signing.attempt)
          ) {
            throw ethErrors.provider.userRejectedRequest();
          }
          signingAttempt = options.signing.attempt;
        } else {
          signingAttempt =
            activeAttempt || signingFlowService.createAttempt(signingFlow);
        }
        if (!signingAttempt) throw ethErrors.provider.userRejectedRequest();
        const approvalRef = toApprovalRef(approval.id, data.approvalComponent);
        if (
          !signingFlowService.attachApproval(signingFlow, approvalRef) ||
          !signingFlowService.bindAttemptApproval(signingAttempt, approvalRef)
        ) {
          throw ethErrors.provider.userRejectedRequest();
        }
        data.signing = { flow: signingFlow, attempt: signingAttempt };
      }

      if (data.isUnshift) {
        this.approvals = [approval, ...this.approvals];
        this.currentApproval = approval;
      } else {
        this.approvals = [...this.approvals, approval];
        if (!this.currentApproval) {
          this.currentApproval = approval;
        }
      }
      this.notifyApprovalCreated(approval);

      // TODO: queued approvals currently drop onCurrent, so preparation only
      // starts for the approval that is current when requestApproval runs.
      if (this.currentApproval === approval) {
        try {
          options?.onCurrent?.();
        } catch (e) {
          Sentry.captureException(
            new Error('onCurrent failed: ' + JSON.stringify(e))
          );
        }
      }

      if (
        this.notifiWindowId !== null &&
        QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(data.approvalComponent)
      ) {
        browser.windows.update(this.notifiWindowId, {
          focused: true,
        });
      } else {
        this.openNotification(approval.winProps);
      }
    });
  };

  clear = async (stay = false) => {
    this.invalidateAllSigningFlows();
    this.rejectApprovalWaiters();
    this.approvals = [];
    this.currentApproval = null;
    const notificationWindowId = this.notifiWindowId;
    if (notificationWindowId !== null && !stay) {
      this.notifiWindowId = null;
      try {
        await winMgr.remove(notificationWindowId);
      } catch (e) {
        // ignore error
      }
    }
  };

  rejectAllApprovals = () => {
    this.addLastRejectDapp();
    this.invalidateAllSigningFlows();
    this.approvals.forEach((approval) => {
      approval.reject &&
        approval.reject(
          new EthereumProviderError(4001, 'User rejected the request.')
        );
    });
    this.approvals = [];
    this.currentApproval = null;
    transactionHistoryService.removeAllSigningTx();
    void this.clear();
  };

  invalidateApprovalSession = () => {
    if (this.currentApproval) {
      this.rejectAllApprovals();
    } else {
      this.invalidateAllSigningFlows();
    }
  };

  unLock = () => {
    this.isLocked = false;
  };

  lock = () => {
    this.isLocked = true;
  };

  openNotification = (winProps, ignoreLock = false) => {
    // Only use ignoreLock flag when approval exist but no notification window exist
    if (!ignoreLock) {
      if (this.isLocked) return;
      this.lock();
    }
    if (this.notifiWindowId !== null) {
      winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = null;
    }
    winMgr
      .openNotification(winProps)
      .then((winId) => {
        if (winId == null) {
          if (this.notifiWindowId === null) {
            this.unLock();
          }
          return;
        }
        this.notifiWindowId = winId;
      })
      .catch((e) => {
        if (this.notifiWindowId === null) {
          this.unLock();
        }
        Sentry.captureException(e, {
          tags: { function: 'openNotification' },
        });
      });
  };

  updateNotificationWinProps = (winProps: Windows.UpdateUpdateInfoType) => {
    if (this.notifiWindowId !== null) {
      browser.windows.update(this.notifiWindowId!, winProps);
    }
  };

  setStatsData = (data?: StatsData) => {
    this.statsData = data;
  };

  getStatsData = () => {
    return this.statsData;
  };

  private addLastRejectDapp() {
    // not Rabby dapp
    if (this.currentApproval?.data?.params?.$ctx) return;
    const origin = this.getOrigin();
    if (!origin) {
      return;
    }
    const dapp = this.dappManager.get(origin);
    // same origin and less 1 min
    if (dapp && Date.now() - dapp.lastRejectTimestamp < 60 * 1000) {
      dapp.lastRejectCount = dapp.lastRejectCount + 1;
      dapp.lastRejectTimestamp = Date.now();
    } else {
      this.dappManager.set(origin, {
        lastRejectTimestamp: Date.now(),
        lastRejectCount: 1,
        blockedTimestamp: 0,
        isBlocked: false,
      });
    }
  }

  private clearLastRejectDapp() {
    const origin = this.getOrigin();
    if (!origin) {
      return;
    }
    this.dappManager.delete(origin);
  }

  checkNeedDisplayBlockedRequestApproval = () => {
    const origin = this.getOrigin();
    if (!origin) {
      return false;
    }
    const dapp = this.dappManager.get(origin);
    if (!dapp) return false;
    // less 1 min and reject count more than 2 times
    if (
      Date.now() - dapp.lastRejectTimestamp < 60 * 1000 &&
      dapp.lastRejectCount >= 2
    ) {
      return true;
    }
    return false;
  };
  checkNeedDisplayCancelAllApproval = () => {
    return this.approvals.length > 1;
  };

  blockedDapp = () => {
    const origin = this.getOrigin();
    if (!origin) {
      return;
    }
    const dapp = this.dappManager.get(origin);
    if (!dapp) return;

    dapp.isBlocked = true;
    dapp.blockedTimestamp = Date.now();
  };

  private getOrigin(data = this.currentApproval?.data) {
    return data?.params?.origin || data?.origin;
  }
}

export default new NotificationService();
