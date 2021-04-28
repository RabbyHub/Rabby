import { ethErrors } from 'eth-rpc-errors';
import { winMgr } from 'background/webapi';

// something need user approval in window
// should only open one window, unfocus will close the current notification
class Notification {
  approval: any = null;
  notifiWindowId = 0;

  constructor() {
    winMgr.event.on('windowRemoved', (winId) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    winMgr.event.on('windowFocusChange', (winId) => {
      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        this.rejectApproval();
      }
    });
  }

  getApproval = () => this.approval?.data;

  resolveApproval = () => {
    this.approval?.resolve();
    this.approval = null;
  };

  rejectApproval = async (err?) => {
    this.approval?.reject(ethErrors.provider.userRejectedRequest(err));
    await this.clear();
  };

  requestApproval = (data) => {
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
    winMgr.create().then((winId) => {
      this.notifiWindowId = winId;
    });
  };
}

export default new Notification();
