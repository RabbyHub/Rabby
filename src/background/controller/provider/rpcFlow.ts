import { ethErrors } from 'eth-rpc-errors';
import {
  keyringService,
  notificationService,
  permissionService,
} from 'background/service';
import { PromiseFlow, underline2Camelcase } from 'background/utils';
import { EVENTS } from 'consts';
import providerController from './controller';
import eventBus from '@/eventBus';

const isSignApproval = (type: string) => {
  const SIGN_APPROVALS = ['SignText', 'SignTypedData', 'SignTx'];
  return SIGN_APPROVALS.includes(type);
};

const flow = new PromiseFlow();
const flowContext = flow
  .use(async (ctx, next) => {
    // check method
    const {
      data: { method },
    } = ctx.request;
    ctx.mapMethod = underline2Camelcase(method);

    if (!providerController[ctx.mapMethod]) {
      if (method.startsWith('eth_')) {
        return providerController.ethRpc(ctx.request);
      }

      throw ethErrors.rpc.methodNotFound({
        message: `method [${method}] doesn't has corresponding handler`,
        data: ctx.request.data,
      });
    }

    return next();
  })
  .use(async ({ mapMethod }, next) => {
    if (!Reflect.getMetadata('SAFE', providerController, mapMethod)) {
      // check lock
      const isUnlock = keyringService.memStore.getState().isUnlocked;

      if (!isUnlock) {
        flow.requestedApproval = true;
        await notificationService.requestApproval({ lock: true });
      }
    }

    return next();
  })
  .use(async (ctx, next) => {
    // check connect
    const {
      request: {
        session: { origin, name, icon },
      },
      mapMethod,
    } = ctx;
    if (!Reflect.getMetadata('SAFE', providerController, mapMethod)) {
      if (!permissionService.hasPerssmion(origin)) {
        flow.requestedApproval = true;
        const { defaultChain } = await notificationService.requestApproval(
          {
            params: { origin, name, icon },
            approvalComponent: 'Connect',
          },
          { height: 390 }
        );

        permissionService.addConnectedSite(origin, name, icon, defaultChain);
      }
    }

    return next();
  })
  .use(async (ctx, next) => {
    // check need approval
    const {
      request: {
        data: { params, method },
        session: { origin, name, icon },
      },
      mapMethod,
    } = ctx;
    const [approvalType, condition, { height = 770 } = {}] =
      Reflect.getMetadata('APPROVAL', providerController, mapMethod) || [];

    if (approvalType && (!condition || !condition(ctx.request))) {
      flow.requestedApproval = true;
      ctx.approvalRes = await notificationService.requestApproval(
        {
          approvalComponent: approvalType,
          params: {
            method,
            data: params,
            session: { origin, name, icon },
          },
          origin,
        },
        { height }
      );
      if (isSignApproval(approvalType)) {
        permissionService.updateConnectSite(origin, { isSigned: true }, true);
      } else {
        permissionService.touchConnectedSite(origin);
      }
    }

    return next();
  })
  .use(async ({ approvalRes, mapMethod, request }) => {
    // process request
    const [approvalType] =
      Reflect.getMetadata('APPROVAL', providerController, mapMethod) || [];
    const { uiRequestComponent, ...rest } = approvalRes || {};
    const {
      session: { origin },
    } = request;
    const requestDefer = Promise.resolve(
      providerController[mapMethod]({
        ...request,
        approvalRes,
      })
    );

    requestDefer
      .then((result) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.SIGN_FINISHED,
          params: {
            success: true,
            data: result,
          },
        });
        return result;
      })
      .catch((e: any) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.SIGN_FINISHED,
          params: {
            success: false,
            errorMsg: JSON.stringify(e),
          },
        });
      });

    if (uiRequestComponent) {
      flow.requestedApproval = true;
      return await notificationService.requestApproval({
        approvalComponent: uiRequestComponent,
        params: rest,
        origin,
        approvalType,
      });
    }

    return requestDefer;
  })
  .callback();

export default (request) => {
  return flowContext({ request }).finally(() => {
    const isApproval =
      Reflect.getMetadata(
        'APPROVAL',
        providerController,
        underline2Camelcase(request?.data.method)
      ) ||
      Reflect.getMetadata(
        'SAFE',
        providerController,
        underline2Camelcase(request?.data.method)
      ) ||
      flow.requestedApproval;
    if (isApproval) {
      flow.requestedApproval = false;
      // only unlock notification if current flow is an approval flow
      notificationService.unLock();
    }
  });
};
