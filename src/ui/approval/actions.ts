import { useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import type { Account } from 'background/service/preference';
import type {
  ApprovalActionResult,
  RejectApprovalCommand,
  ResolveApprovalCommand,
} from 'background/service/notification';
import { useApprovalPopup } from '@/ui/utils/approval-popup';
import { useDeviceConnect } from '@/ui/utils/useDeviceConnect';
import { useWallet } from '@/ui/utils/WalletContext';
import { useApprovalScope } from './context';
import type { SigningAttemptRef } from '@/utils/signingTypes';

export type ApprovalResolveOptions = {
  stay?: boolean;
  forceReject?: boolean;
  attempt?: SigningAttemptRef;
};

export type ApprovalRejectOptions = {
  stay?: boolean;
  isInternal?: boolean;
  attempt?: SigningAttemptRef;
};

type ApprovalActionDependencies = {
  approval: ResolveApprovalCommand['approval'];
  account: Account;
  isCurrent: () => Promise<boolean>;
  canResolve?: () => boolean;
  deviceConnect: (data: any, account: Account) => Promise<boolean>;
  resolveApprovalFor: (
    command: ResolveApprovalCommand
  ) => Promise<ApprovalActionResult>;
  rejectApprovalFor: (
    command: RejectApprovalCommand
  ) => Promise<ApprovalActionResult>;
  onResolved: (data?: any) => void;
  onRejected: () => void;
};

const staleApprovalResult: ApprovalActionResult = {
  accepted: false,
  reason: 'APPROVAL_ID_MISMATCH',
};

export const createApprovalActions = ({
  approval,
  account,
  isCurrent,
  canResolve,
  deviceConnect,
  resolveApprovalFor,
  rejectApprovalFor,
  onResolved,
  onRejected,
}: ApprovalActionDependencies) => {
  return {
    isBound: isCurrent,
    resolve: async (
      data?: any,
      options: ApprovalResolveOptions = {}
    ): Promise<ApprovalActionResult | undefined> => {
      if (canResolve?.() === false) return;
      if (!(await isCurrent())) return staleApprovalResult;
      if (canResolve?.() === false) return;
      if (!(await deviceConnect(data, account))) return;
      if (!(await isCurrent())) return staleApprovalResult;
      if (canResolve?.() === false) return;

      const signingAttempt = options.attempt;
      const result = await resolveApprovalFor({
        approval,
        data,
        forceReject: options.forceReject,
        ...(signingAttempt ? { signing: { attempt: signingAttempt } } : {}),
      });
      if (result.accepted && !options.stay) onResolved(data);
      return result;
    },
    reject: async (
      error?: string,
      options: ApprovalRejectOptions = {}
    ): Promise<ApprovalActionResult> => {
      if (!(await isCurrent())) return staleApprovalResult;
      const signingAttempt = options.attempt;
      const result = await rejectApprovalFor({
        approval,
        error,
        stay: options.stay,
        isInternal: options.isInternal,
        ...(signingAttempt ? { signing: { attempt: signingAttempt } } : {}),
      });
      if (result.accepted && !options.stay) onRejected();
      return result;
    },
  };
};

export const useApprovalActions = (canResolve?: () => boolean) => {
  const approval = useApprovalScope();
  const wallet = useWallet();
  const history = useHistory();
  const { showPopup, enablePopup } = useApprovalPopup();
  const deviceConnect = useDeviceConnect();
  const mounted = useRef(true);
  const latest = useRef({ approval: approval.approval, canResolve });
  latest.current = { approval: approval.approval, canResolve };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useMemo(() => {
    const matchesScope = () =>
      mounted.current &&
      approval.approval.approvalId === latest.current.approval.approvalId &&
      approval.approval.component === latest.current.approval.component;
    const actions = createApprovalActions({
      approval: approval.approval,
      account: approval.account,
      isCurrent: async () => {
        if (!matchesScope()) return false;
        const current = await wallet.getCurrentApproval();
        return (
          matchesScope() &&
          current?.id === approval.approval.approvalId &&
          current?.data.approvalComponent === approval.approval.component
        );
      },
      canResolve: () =>
        matchesScope() &&
        canResolve?.() !== false &&
        latest.current.canResolve?.() !== false,
      deviceConnect,
      resolveApprovalFor: (command) => wallet.resolveApprovalFor(command),
      rejectApprovalFor: (command) => wallet.rejectApprovalFor(command),
      onResolved: (data) => {
        setTimeout(() => {
          if (!matchesScope()) return;
          if (data && enablePopup(data.type)) {
            showPopup();
          } else {
            history.replace('/');
          }
        }, 0);
      },
      onRejected: () => {
        if (matchesScope()) history.push('/');
      },
    });

    return actions;
  }, [
    approval,
    canResolve,
    deviceConnect,
    enablePopup,
    history,
    showPopup,
    wallet,
  ]);
};
