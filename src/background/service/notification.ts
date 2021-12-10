import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';
import {
  IS_CHROME,
  IS_LINUX,
  KEYRING_TYPE,
  NOT_CLOSE_UNFOCUS_LIST,
} from 'consts';
import preferenceService from './preference';

interface Approval {
  data: {
    state: number;
    params?: any;
    origin?: string;
    approvalComponent: string;
    requestDefer?: Promise<any>;
    approvalType: string;
  };
  resolve(params?: any): void;
  reject(err: EthereumProviderError<any>): void;
}

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService {
  approval: Approval | null = null;
  notifiWindowId = 0;
  isLocked = false;

  constructor() {
    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    winMgr.event.on('windowFocusChange', (winId: number) => {
      const account = preferenceService.getCurrentAccount()!;
      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        if (process.env.NODE_ENV === 'production') {
          if (
            (IS_CHROME &&
              winId === chrome.windows.WINDOW_ID_NONE &&
              IS_LINUX) ||
            (account?.type === KEYRING_TYPE.WalletConnectKeyring &&
              NOT_CLOSE_UNFOCUS_LIST.includes(account.brandName))
          ) {
            // Wired issue: When notification popuped, will focus to -1 first then focus on notification
            return;
          }
          this.rejectApproval();
        }
      }
    });
  }

  getApproval = () => this.approval?.data;

  resolveApproval = (data?: any) => {
    this.approval?.resolve(data);
    this.approval = null;
  };

  rejectApproval = async (err?: string) => {
    this.approval?.reject(ethErrors.provider.userRejectedRequest<any>(err));
    await this.clear();
  };

  // currently it only support one approval at the same time
  requestApproval = async (data, winProps?): Promise<any> => {
    // if the request comes into while user approving
    if (this.approval) {
      throw ethErrors.provider.userRejectedRequest(
        'please request after current approval resolve'
      );
    }

    // if (preferenceService.getPopupOpen()) {
    //   this.approval = null;
    //   throw ethErrors.provider.userRejectedRequest(
    //     'please request after user close current popup'
    //   );
    // }

    return new Promise((resolve, reject) => {
      this.approval = {
        data,
        resolve,
        reject,
      };

      this.openNotification(winProps);
    });
  };

  clear = async () => {
    this.approval = null;
    if (this.notifiWindowId) {
      await winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
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
