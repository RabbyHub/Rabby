import { openNotification } from "background/webapi";

// something need user approval in window
// should always open only one window
class Notification {
  notification = new Map();

  getApproval = (tabId) => {
    if (!tabId) {
      return this.notification.values().next().value;
    }
    return this.notification.get(tabId);
  };

  handleApproval = (tabId, { err, res }) => {
    const { resolve, reject } = this.getApproval(tabId);

    err ? reject(err) : resolve(res);
  };

  notify = (tabId, data) => {
    console.log('notify:', data);
    return new Promise((resolve, reject) => {
      this.notification.set(tabId, {
        ...data,
        resolve,
        reject,
      });

      openNotification(`#id=${tabId}`);
    }).finally(() => this.clear(tabId));
  };

  clear = (tabId) => {
    this.notification.delete(tabId);
  };
}

export default new Notification();
