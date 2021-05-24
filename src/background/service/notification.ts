import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';

interface Approval {
  data: {
    state: number;
    params?: any;
    origin?: string;
    aporovalComponent: string;
  };
  resolve(params?: any): void;
  reject(err: EthereumProviderError<any>): void;
}

// something need user approval in window
// should only open one window, unfocus will close the current notification
class Notification {
  approval: Approval | null = null;
  notifiWindowId = 0;

  constructor() {
    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    // winMgr.event.on('windowFocusChange', (winId: number) => {
    //   if (this.notifiWindowId && winId !== this.notifiWindowId) {
    //     this.rejectApproval();
    //   }
    // });
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

  requestApproval = (data): Promise<any> => {
    return new Promise((resolve, reject) => {
      this.approval = {
        data,
        resolve,
        reject,
      };

      try {
        this.openNotification();
      } catch (err) {
        reject(err);
      }
    });
  };

  clear = async () => {
    this.approval = null;
    if (this.notifiWindowId) {
      await winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
  };

  openNotification = () => {
    if (this.notifiWindowId) {
      return;
    }
    winMgr.openNotification().then((winId) => {
      this.notifiWindowId = winId!;
    });
  };
}

export default new Notification();
