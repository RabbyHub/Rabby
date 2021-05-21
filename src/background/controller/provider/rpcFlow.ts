import { ethErrors } from 'eth-rpc-errors';
import { APPROVAL_STATE } from 'consts';
import { keyringService, notification, permission } from 'background/service';
import providerController from './controller';

export default class RpcFlow {
  approvalType: string | null = null;
  approvalRes: any;
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
          const { defaultChain } = await notification.requestApproval({
            state: APPROVAL_STATE.CONNECT,
            params: { origin, name, icon },
            type: 'Connect',
          });
          permission.addConnectedSite(origin, name, icon, defaultChain);
        }

        this.approvalType = Reflect.getMetadata(
          'APPROVAL',
          providerController,
          mapMethod
        );
        if (this.approvalType) {
          this.currentState = APPROVAL_STATE.APPROVAL;
        } else {
          this.currentState = APPROVAL_STATE.REQUEST;
        }

        break;

      case APPROVAL_STATE.APPROVAL:
        await notification.requestApproval({
          state: APPROVAL_STATE.APPROVAL,
          type: this.approvalType,
          params: {
            data: params,
            session: { origin, name, icon },
          },
          origin,
        });
        if (permission.hasPerssmion(origin)) {
          permission.touchConnectedSite(origin);
        }
        this.approvalType = null;
        this.currentState = APPROVAL_STATE.REQUEST;
        break;

      case APPROVAL_STATE.REQUEST: {
        const { uiRequest, ...rest } = this.approvalRes || {};

        const requestDeffer = Promise.resolve(
          providerController[mapMethod](req)
        ).finally(() => {
          this.currentState = APPROVAL_STATE.END;
        });

        if (uiRequest) {
          return await notification.requestApproval({
            state: APPROVAL_STATE.APPROVAL,
            type: uiRequest,
            requestDeffer,
            params: rest,
            origin,
          });
        }

        return requestDeffer;
      }

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
