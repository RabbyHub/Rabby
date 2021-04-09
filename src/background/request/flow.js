import { APPROVAL_STATE } from 'constants';
import eth from 'background/eth';
import { notification, permission } from 'background/wallet';
import methods, { NEED_CONFIRM } from 'background/request';

export default class RequestFlow {
  currentState = eth.isUnlocked() ? APPROVAL_STATE.UNLOCK : APPROVAL_STATE.LOCK;

  forwardNext = async (req) => {
    const { tabId, data: { method, params }, origin } = req;

    switch (this.currentState) {
      case APPROVAL_STATE.LOCK:
        await notification.notify(tabId, {
          id: tabId,
          state: APPROVAL_STATE.UNLOCK,
        });
        this.currentState = APPROVAL_STATE.UNLOCK;
        break;

      case APPROVAL_STATE.UNLOCK:
        const siteMetadata = permission.sitesMetadata.get(origin);

        // TODO: check the method permission
        if (!permission.hasPerssmion(origin)) {
          await notification.notify(tabId, {
            id: tabId,
            state: APPROVAL_STATE.CONNECT,
            params: siteMetadata,
          });
          permission.addConnectedSite(origin);
        }

        if (NEED_CONFIRM.includes(method)) {
          this.currentState = APPROVAL_STATE.SIGN;
        } else {
          this.currentState = APPROVAL_STATE.REQUEST;
        }

        break;

      case APPROVAL_STATE.SIGN:
        await notification.notify(tabId, {
          id: tabId,
          state: APPROVAL_STATE.SIGN,
          params,
        });

        this.currentState = APPROVAL_STATE.REQUEST;
        break;

      case APPROVAL_STATE.REQUEST:
        return Promise.resolve(methods[method](req)).finally(() => {
          this.currentState = APPROVAL_STATE.END;
        });

      default:
    }

  }

  handle = async (req) => {
    const { tabId, data: { method, params }, origin } = req;

    if (!methods[method]) {
      throw new Error(`method [${method}] doesn't has corresponding handler`);
    }

    let result;
    while (this.currentState <= APPROVAL_STATE.REQUEST) {
      result = await this.forwardNext(req);
    }

    return result;
  }
}
