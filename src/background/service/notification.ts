import browser, { Windows } from 'webextension-polyfill';
import Events from 'events';
import {
  ApprovalRef,
  SigningResult,
  SigningRetry,
  toApprovalRef,
} from '@/utils/signingTypes';
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
    approvalType?: string;
    signingAttempt?: number;
  };
  winProps: any;
  resolve?(params?: any): void;
  reject?(err: EthereumProviderError<any>): void;
  signing?: {
    run: (
      executionId: string,
      signal: AbortSignal,
      retry?: SigningRetry
    ) => Promise<SigningResult>;
    controller?: AbortController;
    result?: Promise<SigningResult>;
  };
}

export type ResolveApprovalCommand = {
  approval: ApprovalRef<Approval['data']['approvalComponent']>;
  data?: any;
  forceReject?: boolean;
};

export type RejectApprovalCommand = {
  approval: ApprovalRef<Approval['data']['approvalComponent']>;
  error?: string;
  stay?: boolean;
  isInternal?: boolean;
};

export type ApprovalActionResult =
  | { accepted: true }
  | {
      accepted: false;
      reason:
        | 'NO_CURRENT_APPROVAL'
        | 'APPROVAL_ID_MISMATCH'
        | 'APPROVAL_COMPONENT_MISMATCH';
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
          void this.rejectApprovalFor({
            approval: toApprovalRef(
              this.currentApproval.id,
              this.currentApproval.data.approvalComponent
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
    approval?.signing?.controller?.abort();
    if (approval && this.approvals.length > 1) {
      this.approvals = this.approvals.filter((item) => approval.id !== item.id);
    } else {
      this.currentApproval = null;
      this.approvals = [];
    }
  };

  getApproval = () => this.currentApproval;

  getCurrentApproval = this.getApproval;

  isApprovalCurrent = (approvalId: string) =>
    !!approvalId && this.currentApproval?.id === approvalId;

  private checkApproval(approval?: ApprovalRef): ApprovalActionResult {
    const current = this.currentApproval;
    if (!current) return { accepted: false, reason: 'NO_CURRENT_APPROVAL' };
    if (!approval?.approvalId || current.id !== approval.approvalId) {
      return { accepted: false, reason: 'APPROVAL_ID_MISMATCH' };
    }
    if (current.data.approvalComponent !== approval.component) {
      return { accepted: false, reason: 'APPROVAL_COMPONENT_MISMATCH' };
    }
    return { accepted: true };
  }

  resolveApprovalFor = async ({
    approval: ref,
    data,
    forceReject = false,
  }: ResolveApprovalCommand): Promise<ApprovalActionResult> => {
    const checked = this.checkApproval(ref);
    if (!checked.accepted) return checked;
    const approval = this.currentApproval!;
    this.clearLastRejectDapp();
    this.deleteApproval(approval);
    this.currentApproval = this.approvals[0] || null;
    if (forceReject) {
      approval.reject?.(new EthereumProviderError(4001, 'User Cancel'));
    } else {
      approval.resolve?.(data);
    }
    this.emit('resolve', data);
    return { accepted: true };
  };

  rejectApprovalFor = async ({
    approval: ref,
    error,
    stay = false,
    isInternal = false,
  }: RejectApprovalCommand): Promise<ApprovalActionResult> => {
    const checked = this.checkApproval(ref);
    if (!checked.accepted) return checked;
    const approval = this.currentApproval!;
    this.addLastRejectDapp();
    if (approval.data.params?.data?.[0]?.isCoboSafe) {
      void preferenceService.resetCurrentCoboSafeAddress();
    }
    this.deleteApproval(approval);
    this.currentApproval = this.approvals[0] || null;
    if (approval.signingTxId) {
      transactionHistoryService.removeSigningTx(approval.signingTxId);
    }
    approval.reject?.(
      isInternal
        ? ethErrors.rpc.internal(error)
        : ethErrors.provider.userRejectedRequest<any>(error)
    );
    if (!this.currentApproval) await this.clear(stay);
    this.emit('reject', error);
    return { accepted: true };
  };

  requestApproval = async (
    data,
    winProps?,
    options?: {
      onCurrent?: () => void;
      sign?: NonNullable<Approval['signing']>['run'];
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
        data: options?.sign ? { ...data, signingAttempt: 0 } : data,
        winProps,
        signing: options?.sign ? { run: options.sign } : undefined,
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
    this.approvals.forEach((approval) => approval.signing?.controller?.abort());
    this.approvals = [];
    this.currentApproval = null;
    if (this.notifiWindowId !== null && !stay) {
      const windowId = this.notifiWindowId;
      this.notifiWindowId = null;
      this.unLock();
      try {
        await winMgr.remove(windowId);
      } catch (e) {
        // ignore error
      }
    }
  };

  rejectAllApprovals = () => {
    this.addLastRejectDapp();
    this.approvals.forEach((approval) => {
      approval.signing?.controller?.abort();
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

  signApproval = async (
    ref: ApprovalRef,
    attempt: number,
    retry?: SigningRetry
  ) => {
    if (!this.checkApproval(ref).accepted) return;
    const approval = this.currentApproval!;
    const signing = approval.signing;
    if (!signing || !Number.isSafeInteger(attempt) || attempt < 0) return;
    const isNextAttempt = attempt === approval.data.signingAttempt! + 1;
    if (attempt !== approval.data.signingAttempt && !(retry && isNextAttempt))
      return;

    // Reopening or retrying the same attempt joins its promise. Only the
    // next sequence number can start another signing operation.
    if (!signing.result || isNextAttempt) {
      signing.controller?.abort();
      signing.controller = new AbortController();
      approval.data.signingAttempt = attempt;
      signing.result = signing.run(
        `${approval.id}:${attempt}`,
        signing.controller.signal,
        retry
      );
    }
    const result = await signing.result;
    if (
      this.checkApproval(ref).accepted &&
      approval.data.signingAttempt === attempt &&
      !signing.controller?.signal.aborted
    )
      return result;
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
