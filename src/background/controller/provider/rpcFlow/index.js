import { APPROVAL_STATE } from 'constants';
import { eth, notification, permission } from 'background/service';
import * as methods from './methods';

const NEED_CONFIRM = ['personal_sign', 'eth_sendTransaction'];

export default class RequestFlow {
  currentState = eth.isUnlocked() ? APPROVAL_STATE.UNLOCK : APPROVAL_STATE.LOCK;

  forwardNext = async (req) => {
    const {
      data: { method, params },
      session: { origin, name, icon },
      mapMethod,
    } = req;

    switch (this.currentState) {
      case APPROVAL_STATE.LOCK:
        await notification.requestApproval({
          state: APPROVAL_STATE.UNLOCK,
        });
        this.currentState = APPROVAL_STATE.UNLOCK;
        break;

      case APPROVAL_STATE.UNLOCK:
        if (!permission.hasPerssmion(origin)) {
          await notification.requestApproval({
            state: APPROVAL_STATE.CONNECT,
            params: { origin, name, icon },
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
        await notification.requestApproval({
          state: APPROVAL_STATE.SIGN,
          params,
          origin,
        });

        this.currentState = APPROVAL_STATE.REQUEST;
        break;

      case APPROVAL_STATE.REQUEST:
        return Promise.resolve(methods[mapMethod](req)).finally(() => {
          this.currentState = APPROVAL_STATE.END;
        });

      default:
    }
  };

  handle = async (req) => {
    const {
      data: { method },
    } = req;

    // map method name, eth_chainId -> ethChainId
    const mapMethod = method.replace(/_(.)/g, (m, p1) => p1.toUpperCase());
    if (!methods[mapMethod]) {
      throw new Error(`method [${method}] doesn't has corresponding handler`);
    }

    req.mapMethod = mapMethod;
    let result;
    while (this.currentState <= APPROVAL_STATE.REQUEST) {
      result = await this.forwardNext(req);
    }

    return result;
  };
}
