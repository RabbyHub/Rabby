import { ethErrors } from 'eth-rpc-errors';
import { winMgr } from 'background/webapi';

// something need user approval in window
// should only open one window, unfocus will close the current notification
class Notification {
  approval = null;
  notifiWindowId = 0;

  constructor() {
    winMgr.event.on('windowRemoved', (winId) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    winMgr.event.on('windowFocusChange', (winId) => {
      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        this.handleApproval('');
      }
    });
  }

  getApproval = () => this.approval;

  handleApproval = (err) => {
    if (!this.approval) return;
    const { resolve, reject } = this.approval;

    this.clear();
    // consider empty string '' as default error message
    err !== void 0
      ? reject(ethErrors.provider.userRejectedRequest(err))
      : resolve();
  };

  requestApproval = (data) => {
    return new Promise((resolve, reject) => {
      this.approval = {
        ...data,
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

  clear = () => {
    this.approval = null;
    if (this.notifiWindowId) {
      winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
  };

  openNotification = () => {
    winMgr.create().then((winId) => {
      this.notifiWindowId = winId;
    });
  };
}

export default new Notification();
