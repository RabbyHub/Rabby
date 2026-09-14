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

type IApprovalComponents = typeof import('@/ui/views/Approval/components');
type IApprovalComponent = IApprovalComponents[keyof IApprovalComponents];

// 'Unlock' is a real approval type (see rpcFlow.ts) not rendered through the
// Approval/components dispatch table, so it can't be derived from IApprovalComponents.
export type ApprovalKind = keyof IApprovalComponents | 'Unlock';

// Runtime mirror of ApprovalKind (type-only, erased at compile time). Keep in sync
// with the components barrel + 'Unlock' — checked by approvalIdentityStatic.test.ts.
export const KNOWN_APPROVAL_KINDS = new Set<ApprovalKind>([
  'Unlock',
  'SignText',
  'SignTx',
  'SignTypedData',
  'Connect',
  'WatchAddressWaiting',
  'CoinbaseWaiting',
  'AddChain',
  'SwitchChain',
  'QRHardWareWaiting',
  'LedgerHardwareWaiting',
  'CommonWaiting',
  'PrivatekeyWaiting',
  'AddAsset',
  'GetPublicKey',
  'Decrypt',
  'ETHSign',
  'ImportAddress',
  'ImKeyHardwareWaiting',
]);

// Identity a settlement call must present — both required, no fallback to "whatever is currently pending".
export type ApprovalRef = Readonly<{
  id: string;
  component: ApprovalKind;
}>;

export type ApprovalSettleFailureReason =
  | 'INVALID_APPROVAL_REF'
  | 'NO_CURRENT_APPROVAL'
  | 'APPROVAL_ID_MISMATCH'
  | 'APPROVAL_COMPONENT_MISMATCH';

export type ApprovalSettleResult =
  | { accepted: true }
  | { accepted: false; reason: ApprovalSettleFailureReason };

function isValidApprovalRef(ref: unknown): ref is ApprovalRef {
  if (!ref || typeof ref !== 'object') return false;
  const { id, component } = ref as Partial<ApprovalRef>;
  if (typeof id !== 'string' || id.length === 0) return false;
  if (typeof component !== 'string' || !KNOWN_APPROVAL_KINDS.has(component)) {
    return false;
  }
  return true;
}

export interface Approval {
  id: string;
  taskId: number | null;
  signingTxId?: string;
  data: {
    params?: import('react').ComponentProps<IApprovalComponent>['params'];
    account: Account;
    origin?: string;
    approvalComponent: ApprovalKind;
    requestDefer?: Promise<any>;
    approvalType?: string;
  };
  winProps: any;
  resolve?(params?: any): void;
  reject?(err: EthereumProviderError<any>): void;
}

const QUEUE_APPROVAL_COMPONENTS_WHITELIST: ApprovalKind[] = [
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
  currentRequestDeferFn?: (retry?: boolean) => void;
  statsData: StatsData | undefined;

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
        const current = this.currentApproval;
        if (
          current &&
          !QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(
            current.data.approvalComponent
          )
        ) {
          // Window lost focus: capture the ref now and settle through the same strict path as any other caller.
          this.rejectApprovalFor({
            approval: {
              id: current.id,
              component: current.data.approvalComponent,
            },
            isInternal: false,
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

  getApproval = () => this.currentApproval;

  /**
   * The only entry points that settle a single approval — no overload falls back to
   * "whatever is currentApproval now". Validation and consumption happen in the same
   * synchronous span, so a concurrent resolve/reject/duplicate call settles it at most once.
   */
  resolveApprovalFor = ({
    approval,
    data,
    forceReject = false,
  }: {
    approval: ApprovalRef;
    data?: any;
    forceReject?: boolean;
  }): ApprovalSettleResult => {
    if (!isValidApprovalRef(approval)) {
      return { accepted: false, reason: 'INVALID_APPROVAL_REF' };
    }
    const current = this.currentApproval;
    if (!current) {
      return { accepted: false, reason: 'NO_CURRENT_APPROVAL' };
    }
    if (current.id !== approval.id) {
      return { accepted: false, reason: 'APPROVAL_ID_MISMATCH' };
    }
    if (current.data.approvalComponent !== approval.component) {
      return { accepted: false, reason: 'APPROVAL_COMPONENT_MISMATCH' };
    }

    // --- validated: from here `current` can no longer be re-consumed ---
    if (forceReject) {
      current.reject?.(new EthereumProviderError(4001, 'User Cancel'));
    } else {
      current.resolve?.(data);
    }

    this.clearLastRejectDapp();
    this.deleteApproval(current);
    this.currentApproval = this.approvals.length > 0 ? this.approvals[0] : null;

    this.emit('resolve', data);
    return { accepted: true };
  };

  rejectApprovalFor = async ({
    approval,
    error,
    stay = false,
    isInternal = false,
  }: {
    approval: ApprovalRef;
    error?: string;
    stay?: boolean;
    isInternal?: boolean;
  }): Promise<ApprovalSettleResult> => {
    if (!isValidApprovalRef(approval)) {
      return { accepted: false, reason: 'INVALID_APPROVAL_REF' };
    }
    const current = this.currentApproval;
    if (!current) {
      return { accepted: false, reason: 'NO_CURRENT_APPROVAL' };
    }
    if (current.id !== approval.id) {
      return { accepted: false, reason: 'APPROVAL_ID_MISMATCH' };
    }
    if (current.data.approvalComponent !== approval.component) {
      return { accepted: false, reason: 'APPROVAL_COMPONENT_MISMATCH' };
    }

    // --- validated: from here `current` can no longer be re-consumed ---
    this.addLastRejectDapp();
    if (isInternal) {
      current.reject?.(ethErrors.rpc.internal(error));
    } else {
      current.reject?.(ethErrors.provider.userRejectedRequest<any>(error));
    }

    if (current.signingTxId) {
      transactionHistoryService.removeSigningTx(current.signingTxId);
    }

    if (this.approvals.length > 1) {
      this.deleteApproval(current);
      this.currentApproval = this.approvals[0];
      this.emit('reject', error);
      return { accepted: true };
    }

    // Only cleanup (closing the window) remains async — the approval was already consumed above.
    await this.clear(stay);
    this.emit('reject', error);
    return { accepted: true };
  };

  requestApproval = async (
    data,
    winProps?,
    options?: { onCurrent?: () => void }
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

      if (
        !QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(data.approvalComponent)
      ) {
        if (this.currentApproval) {
          throw ethErrors.provider.userRejectedRequest(
            'please request after current approval resolve'
          );
        }
      } else {
        if (
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

      if (data.isUnshift) {
        this.approvals = [approval, ...this.approvals];
        this.currentApproval = approval;
      } else {
        this.approvals = [...this.approvals, approval];
        if (!this.currentApproval) {
          this.currentApproval = approval;
        }
      }

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
    this.approvals = [];
    this.currentApproval = null;
    if (this.notifiWindowId !== null && !stay) {
      try {
        await winMgr.remove(this.notifiWindowId);
      } catch (e) {
        // ignore error
      }
      this.notifiWindowId = null;
    }
  };

  rejectAllApprovals = () => {
    this.addLastRejectDapp();
    this.approvals.forEach((approval) => {
      approval.reject &&
        approval.reject(
          new EthereumProviderError(4001, 'User rejected the request.')
        );
    });
    this.approvals = [];
    this.currentApproval = null;
    transactionHistoryService.removeAllSigningTx();
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

  setCurrentRequestDeferFn = (fn: (retry?: boolean) => void) => {
    this.currentRequestDeferFn = fn;
  };

  callCurrentRequestDeferFn = (retry?: boolean) => {
    return this.currentRequestDeferFn?.(retry);
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
