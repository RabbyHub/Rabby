import { useMemo } from 'react';
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
  attempt?: SigningAttemptRef;
  account: Account;
  isCurrent: () => Promise<boolean>;
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
  attempt,
  account,
  isCurrent,
  deviceConnect,
  resolveApprovalFor,
  rejectApprovalFor,
  onResolved,
  onRejected,
}: ApprovalActionDependencies) => {
  const isBound = async () => isCurrent();

  return {
    isBound,
    resolve: async (
      data?: any,
      options: ApprovalResolveOptions = {}
    ): Promise<ApprovalActionResult | undefined> => {
      if (!(await isBound())) return staleApprovalResult;
      if (!(await deviceConnect(data, account))) return;
      if (!(await isBound())) return staleApprovalResult;

      const signingAttempt = options.attempt || attempt;
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
      if (!(await isBound())) return staleApprovalResult;
      const signingAttempt = options.attempt || attempt;
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

export const useApprovalActions = () => {
  const approval = useApprovalScope();
  const wallet = useWallet();
  const history = useHistory();
  const { showPopup, enablePopup } = useApprovalPopup();
  const deviceConnect = useDeviceConnect();

  return useMemo(() => {
    const actions = createApprovalActions({
      approval: approval.approval,
      attempt: approval.signing?.attempt,
      account: approval.account,
      isCurrent: () => wallet.isApprovalCurrent(approval.approval.approvalId),
      deviceConnect,
      resolveApprovalFor: (command) => wallet.resolveApprovalFor(command),
      rejectApprovalFor: (command) => wallet.rejectApprovalFor(command),
      onResolved: (data) => {
        setTimeout(() => {
          if (data && enablePopup(data.type)) {
            showPopup();
          } else {
            history.replace('/');
          }
        }, 0);
      },
      onRejected: () => history.push('/'),
    });

    return {
      ...actions,
      reject: async (error?: string, options: ApprovalRejectOptions = {}) => {
        const result = await actions.reject(error, options);
        return result;
      },
    };
  }, [approval, deviceConnect, enablePopup, history, showPopup, wallet]);
};
