import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';
import { preferenceService } from 'background/service';

interface Approval {
  data: {
    state: number;
    params?: any;
    origin?: string;
    aporovalComponent: string;
    requestDefer?: Promise<any>;
  };
  resolve(params?: any): void;
  reject(err: EthereumProviderError<any>): void;
}

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService {
  approval: Approval | null = null;
  notifiWindowId = 0;

  constructor() {
    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    winMgr.event.on('windowFocusChange', (winId: number) => {
      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        this.rejectApproval();
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

    if (preferenceService.getPopupOpen()) {
      this.approval = null;
      throw ethErrors.provider.userRejectedRequest(
        'please request after user close current popup'
      );
    }

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

  openNotification = (winProps) => {
    if (this.notifiWindowId) {
      return;
    }
    winMgr.openNotification(winProps).then((winId) => {
      this.notifiWindowId = winId!;
    });
  };
}

export default new NotificationService();
