import { ethErrors } from 'eth-rpc-errors';
import { winMgr } from 'background/webapi';

// something need user approval in window
// should only open one window
class Notification {
  approval = null;
  notifiWindowId = 0;

  constructor() {
    winMgr.event.on('windowRemoved', (winId) => {
      // console.log('[win]closed', winId);
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    winMgr.event.on('windowFocusChange', (winId) => {
      // console.log('[win]focus changed!', this.notifiWindowId, '->', winId);
      if (
        this.approval &&
        this.notifiWindowId &&
        winId !== this.notifiWindowId
      ) {
        // console.log('[win]remove', this.notifiWindowId);
        winMgr.remove(this.notifiWindowId);
        this.notifiWindowId = 0;
      }
    });
  }

  getApproval = () => this.approval;

  handleApproval = ({ err, res }) => {
    if (!this.approval) return;
    const { resolve, reject } = this.approval;

    this.clear();
    err ? reject(ethErrors.provider.userRejectedRequest(err)) : resolve(res);
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
    // console.log('[approval]clear');
    this.approval = null;
    // this.notifiWindowId = 0;
  };

  openNotification = () => {
    // console.log('[win]create');
    // if (this.notifiWindowId) {
    //   throw new Error('last notification window hasnt closed');
    // }

    winMgr.create().then((winId) => {
      // console.log('[win]opend', winId, this.notifiWindowId);
      this.notifiWindowId = winId;
    });
  };
}

export default new Notification();
