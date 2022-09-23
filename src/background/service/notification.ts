import { browser } from 'webextension-polyfill-ts';
import Events from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';
import { CHAINS, KEYRING_CATEGORY_MAP, IS_LINUX, IS_CHROME } from 'consts';
import transactionHistoryService from './transactionHistory';
import preferenceService from './preference';
import stats from '@/stats';
import BigNumber from 'bignumber.js';

type IApprovalComponents = typeof import('@/ui/views/Approval/components');
type IApprovalComponent = IApprovalComponents[keyof IApprovalComponents];

export interface Approval {
  id: number;
  taskId: number | null;
  data: {
    params?: import('react').ComponentProps<IApprovalComponent>['params'];
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
  'SignTx',
  'SignText',
  'SignTypedData',
];

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
  currentApproval: Approval | null = null;
  _approvals: Approval[] = [];
  notifiWindowId = 0;
  isLocked = false;

  get approvals() {
    return this._approvals;
  }

  set approvals(val: Approval[]) {
    this._approvals = val;
    if (val.length <= 0) {
      browser.browserAction.setBadgeText({
        text: null,
      });
    } else {
      browser.browserAction.setBadgeText({
        text: val.length + '',
      });
      browser.browserAction.setBadgeBackgroundColor({
        color: '#FE815F',
      });
    }
  }

  constructor() {
    super();

    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
        this.rejectAllApprovals();
      }
    });

    winMgr.event.on('windowFocusChange', (winId: number) => {
      if (IS_CHROME && winId === chrome.windows.WINDOW_ID_NONE && IS_LINUX) {
        // When sign on Linux, will focus on -1 first then focus on sign window
        return;
      }

      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        if (
          this.currentApproval &&
          !QUEUE_APPROVAL_COMPONENTS_WHITELIST.includes(
            this.currentApproval.data.approvalComponent
          )
        ) {
          this.rejectApproval();
        }
      }
    });
  }

  activeFirstApproval = () => {
    if (this.notifiWindowId) {
      browser.windows.update(this.notifiWindowId, {
        focused: true,
      });
      return;
    }

    if (this.approvals.length < 0) return;

    const approval = this.approvals[0];
    this.currentApproval = approval;
    this.openNotification(approval.winProps);
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

  resolveApproval = async (data?: any, forceReject = false) => {
    if (forceReject) {
      this.currentApproval?.reject &&
        this.currentApproval?.reject(
          new EthereumProviderError(4001, 'User Cancel')
        );
    } else {
      this.currentApproval?.resolve && this.currentApproval?.resolve(data);
    }

    const approval = this.currentApproval;

    this.deleteApproval(approval);

    if (this.approvals.length > 0) {
      this.currentApproval = this.approvals[0];
    } else {
      this.currentApproval = null;
    }

    this.emit('resolve', data);
  };

  rejectApproval = async (err?: string, stay = false, isInternal = false) => {
    if (isInternal) {
      this.currentApproval?.reject &&
        this.currentApproval?.reject(ethErrors.rpc.internal(err));
    } else {
      this.currentApproval?.reject &&
        this.currentApproval?.reject(
          ethErrors.provider.userRejectedRequest<any>(err)
        );
    }

    const approval = this.currentApproval;

    if (approval && this.approvals.length > 1) {
      this.deleteApproval(approval);
      this.currentApproval = this.approvals[0];
    } else {
      await this.clear(stay);
    }
    this.emit('reject', err);
  };

  requestApproval = async (data, winProps?): Promise<any> => {
    const currentAccount = preferenceService.getCurrentAccount();
    const reportExplain = (approvalId: number) => {
      const explain = transactionHistoryService.getExplainCacheByApprovalId(
        approvalId
      );
      if (explain && currentAccount) {
        stats.report('preExecTransaction', {
          type: currentAccount.brandName,
          category: KEYRING_CATEGORY_MAP[currentAccount.type],
          chainId: explain.native_token.chain,
          success: explain.calcSuccess && explain.pre_exec.success,
          createBy: data?.params.$ctx?.ga ? 'rabby' : 'dapp',
          source: data?.params.$ctx?.ga?.source || '',
          trigger: data?.params.$ctx?.ga.trigger || '',
        });
      }
    };
    return new Promise((resolve, reject) => {
      const uuid = Date.now();
      const approval: Approval = {
        taskId: uuid,
        id: uuid,
        data,
        winProps,
        resolve(data) {
          if (this.data.approvalComponent === 'SignTx') {
            reportExplain(this.id);
          }
          resolve(data);
        },
        reject(data) {
          if (this.data.approvalComponent === 'SignTx') {
            reportExplain(this.id);
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

      if (
        ['wallet_switchEthereumChain', 'wallet_addEthereumChain'].includes(
          data?.params?.method
        )
      ) {
        const chainId = data.params?.data?.[0]?.chainId;
        const chain = Object.values(CHAINS).find((chain) =>
          new BigNumber(chain.hex).isEqualTo(chainId)
        );
        if (chain) {
          this.resolveApproval(null);
          return;
        }
      }

      if (this.notifiWindowId) {
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
    if (this.notifiWindowId && !stay) {
      await winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
  };

  rejectAllApprovals = () => {
    this.approvals.forEach((approval) => {
      approval.reject &&
        approval.reject(
          new EthereumProviderError(4001, 'User rejected the request.')
        );
    });
    this.approvals = [];
    this.currentApproval = null;
  };

  unLock = () => {
    this.isLocked = false;
  };

  lock = () => {
    this.isLocked = true;
  };

  openNotification = (winProps) => {
    if (this.isLocked) return;
    this.lock();
    if (this.notifiWindowId) {
      winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
    winMgr.openNotification(winProps).then((winId) => {
      this.notifiWindowId = winId!;
    });
  };
}

export default new NotificationService();
