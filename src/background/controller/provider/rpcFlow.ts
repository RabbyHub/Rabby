import { ethErrors } from 'eth-rpc-errors';
import {
  keyringService,
  notificationService,
  permissionService,
} from 'background/service';
import { PromiseFlow, underline2Camelcase } from 'background/utils';
import providerController from './controller';

const isSignApproval = (type: string) => {
  const SIGN_APPROVALS = ['SignText', 'SignTypedData', 'SignTx'];
  return SIGN_APPROVALS.includes(type);
};

const flow = new PromiseFlow()
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

    if (uiRequestComponent) {
      return await notificationService.requestApproval({
        approvalComponent: uiRequestComponent,
        requestDefer,
        params: rest,
        origin,
        approvalType,
      });
    }

    return requestDefer;
  })
  .callback();

export default (request) => {
  return flow({ request }).finally(() => {
    notificationService.unLock();
  });
};
