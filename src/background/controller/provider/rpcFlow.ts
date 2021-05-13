import { ethErrors } from 'eth-rpc-errors';
import { APPROVAL_STATE } from 'consts';
import { keyringService, notification, permission } from 'background/service';
import providerController from './controller';

export default class RpcFlow {
  currentState = keyringService.memStore.getState().isUnlocked
    ? APPROVAL_STATE.UNLOCK
    : APPROVAL_STATE.LOCK;

  forwardNext = async (req) => {
    const {
      data: { params },
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
          permission.addConnectedSite(origin, name, icon);
        }

        if (Reflect.getMetadata('approval', providerController, mapMethod)) {
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
        if (permission.hasPerssmion(origin)) {
          permission.touchConnectedSite(origin);
        } else {
          permission.addConnectedSite(origin, name, icon);
        }
        this.currentState = APPROVAL_STATE.REQUEST;
        break;

      case APPROVAL_STATE.REQUEST:
        return Promise.resolve(providerController[mapMethod](req)).finally(
          () => {
            this.currentState = APPROVAL_STATE.END;
          }
        );

      default:
    }
  };

  handle = async (req) => {
    const {
      data: { method },
    } = req;

    // map method name, eth_chainId -> ethChainId
    const mapMethod = method.replace(/_(.)/g, (m, p1) => p1.toUpperCase());
    if (!providerController[mapMethod]) {
      throw ethErrors.rpc.methodNotFound({
        message: `method [${method}] doesn't has corresponding handler`,
        data: req.data,
      });
    }

    req.mapMethod = mapMethod;
    let result;
    while (this.currentState <= APPROVAL_STATE.REQUEST) {
      result = await this.forwardNext(req);
    }

    return result;
  };
}
