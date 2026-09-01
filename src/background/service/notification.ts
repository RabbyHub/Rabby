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

export interface Approval {
  id: string;
  taskId: number | null;
  signingTxId?: string;
  data: {
    params?: import('react').ComponentProps<IApprovalComponent>['params'];
    account: Account;
    origin?: string;
    approvalComponent: keyof IApprovalComponents;
    requestDefer?: Promise<any>;
    approvalType?: string;
  };
  winProps: any;
  resolve?(params?: any): void;
  reject?(err: EthereumProviderError<any>): void;
}

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
        if (
          this.currentApproval &&
          !QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(
            this.currentApproval.data.approvalComponent
          )
        ) {
          // name the approval we just checked: rejectApproval is fail closed,
          // and an unnamed reject would race the queue advancing
          this.rejectApproval(undefined, false, false, this.currentApproval.id);
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

  // A dropped action is invisible from the UI: the button simply does nothing.
  // A mismatch is an ordinary race (double click, a hardware callback landing
  // after the queue moved on), so it only leaves a breadcrumb. A caller that
  // names no approval at all is a programming error - every caller is expected
  // to pass one - so that gets reported.
  private reportDroppedApproval = (
    method: 'resolve' | 'reject',
    approvalId?: string
  ) => {
    const detail = {
      method,
      approvalId,
      currentApprovalId: this.currentApproval?.id,
      approvalComponent: this.currentApproval?.data.approvalComponent,
    };

    Sentry.addBreadcrumb({
      category: 'approval',
      level: 'warning',
      message: `${method}Approval dropped`,
      data: detail,
    });

    if (!approvalId) {
      Sentry.captureException(
        new Error(`${method}Approval called without an approvalId`),
        {
          tags: { function: `${method}Approval` },
          extra: detail,
        }
      );
    }
  };

  resolveApproval = async (
    data?: any,
    forceReject = false,
    approvalId?: string
  ) => {
    // Fail closed: an approval can only be resolved by name. Without an id we
    // would resolve whatever happens to be current, which is not what the
    // caller consented to.
    if (!approvalId || approvalId !== this.currentApproval?.id) {
      this.reportDroppedApproval('resolve', approvalId);
      return;
    }
    if (forceReject) {
      this.currentApproval?.reject &&
        this.currentApproval?.reject(
          new EthereumProviderError(4001, 'User Cancel')
        );
    } else {
      this.currentApproval?.resolve && this.currentApproval?.resolve(data);
    }

    const approval = this.currentApproval;

    this.clearLastRejectDapp();
    this.deleteApproval(approval);

    if (this.approvals.length > 0) {
      this.currentApproval = this.approvals[0];
    } else {
      this.currentApproval = null;
    }

    this.emit('resolve', data);
  };

  rejectApproval = async (
    err?: string,
    stay = false,
    isInternal = false,
    approvalId?: string
  ) => {
    // Fail closed, same as resolveApproval: no id, no rejection.
    if (!approvalId || approvalId !== this.currentApproval?.id) {
      this.reportDroppedApproval('reject', approvalId);
      return;
    }
    this.addLastRejectDapp();
    const approval = this.currentApproval;
    if (this.approvals.length <= 1) {
      await this.clear(stay); // TODO: FIXME
    }

    if (isInternal) {
      approval?.reject && approval?.reject(ethErrors.rpc.internal(err));
    } else {
      approval?.reject &&
        approval?.reject(ethErrors.provider.userRejectedRequest<any>(err));
    }

    if (approval?.signingTxId) {
      transactionHistoryService.removeSigningTx(approval.signingTxId);
    }

    if (approval && this.approvals.length > 1) {
      this.deleteApproval(approval);
      this.currentApproval = this.approvals[0];
    } else {
      await this.clear(stay);
    }
    this.emit('reject', err);
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
