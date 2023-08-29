import { ethErrors } from 'eth-rpc-errors';
import {
  keyringService,
  notificationService,
  permissionService,
} from 'background/service';
import { PromiseFlow, underline2Camelcase } from 'background/utils';
import { CHAINS, EVENTS } from 'consts';
import providerController from './controller';
import eventBus from '@/eventBus';
import { resemblesETHAddress } from '@/utils';
import { ProviderRequest } from './type';

const isSignApproval = (type: string) => {
  const SIGN_APPROVALS = ['SignText', 'SignTypedData', 'SignTx'];
  return SIGN_APPROVALS.includes(type);
};

const lockedOrigins = new Set<string>();
const connectOrigins = new Set<string>();

const flow = new PromiseFlow<{
  request: ProviderRequest & {
    session: Exclude<ProviderRequest, void>;
  };
  mapMethod: string;
  approvalRes: any;
}>();
const flowContext = flow
  .use(async (ctx, next) => {
    // check method
    const {
      data: { method },
    } = ctx.request;
    ctx.mapMethod = underline2Camelcase(method);
    if (Reflect.getMetadata('PRIVATE', providerController, ctx.mapMethod)) {
      // Reject when dapp try to call private controller function
      throw ethErrors.rpc.methodNotFound({
        message: `method [${method}] doesn't has corresponding handler`,
        data: ctx.request.data,
      });
    }
    if (!providerController[ctx.mapMethod]) {
      // TODO: make rpc whitelist
      if (method.startsWith('eth_') || method === 'net_version') {
        return providerController.ethRpc(ctx.request);
      }

      throw ethErrors.rpc.methodNotFound({
        message: `method [${method}] doesn't has corresponding handler`,
        data: ctx.request.data,
      });
    }

    return next();
  })
  .use(async (ctx, next) => {
    const {
      mapMethod,
      request: {
        session: { origin },
      },
    } = ctx;

    if (!Reflect.getMetadata('SAFE', providerController, mapMethod)) {
      // check lock
      const isUnlock = keyringService.memStore.getState().isUnlocked;

      if (!isUnlock) {
        if (lockedOrigins.has(origin)) {
          throw ethErrors.rpc.resourceNotFound(
            'Already processing unlock. Please wait.'
          );
        }
        ctx.request.requestedApproval = true;
        lockedOrigins.add(origin);
        try {
          await notificationService.requestApproval(
            { lock: true },
            { height: 628 }
          );
          lockedOrigins.delete(origin);
        } catch (e) {
          lockedOrigins.delete(origin);
          throw e;
        }
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
      if (!permissionService.hasPermission(origin)) {
        if (connectOrigins.has(origin)) {
          throw ethErrors.rpc.resourceNotFound(
            'Already processing connect. Please wait.'
          );
        }
        ctx.request.requestedApproval = true;
        connectOrigins.add(origin);
        try {
          const {
            defaultChain,
            signPermission,
          } = await notificationService.requestApproval(
            {
              params: { origin, name, icon },
              approvalComponent: 'Connect',
            },
            { height: 800 }
          );
          connectOrigins.delete(origin);
          permissionService.addConnectedSiteV2({
            origin,
            name,
            icon,
            defaultChain,
            signPermission,
          });
        } catch (e) {
          connectOrigins.delete(origin);
          throw e;
        }
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
    const [approvalType, condition, options = {}] =
      Reflect.getMetadata('APPROVAL', providerController, mapMethod) || [];
    let windowHeight = 800;
    if ('height' in options) {
      windowHeight = options.height;
    } else {
      const minHeight = 500;
      // if (screen.availHeight > windowHeight) {
      //   windowHeight = screen.availHeight;
      // }
      if (screen.availHeight < 880) {
        windowHeight = screen.availHeight;
      }
      if (windowHeight < minHeight) {
        windowHeight = minHeight;
      }
    }
    if (approvalType === 'SignText') {
      let from, message;
      const [first, second] = params;
      // Compatible with wrong params order
      // ref: https://github.com/MetaMask/eth-json-rpc-middleware/blob/53c7361944c380e011f5f4ee1e184db746e26d73/src/wallet.ts#L284
      if (resemblesETHAddress(first) && !resemblesETHAddress(second)) {
        from = first;
        message = second;
      } else {
        from = second;
        message = first;
      }
      ctx.request.data.params[0] = message;
      ctx.request.data.params[1] = from;
    }
    if (approvalType && (!condition || !condition(ctx.request))) {
      ctx.request.requestedApproval = true;
      if (approvalType === 'SignTx' && !('chainId' in params[0])) {
        const site = permissionService.getConnectedSite(origin);
        if (site) {
          const chain = Object.values(CHAINS).find(
            (item) => item.enum === site.chain
          );
          if (chain) {
            params[0].chainId = chain.id;
          }
        }
      }
      ctx.approvalRes = await notificationService.requestApproval(
        {
          approvalComponent: approvalType,
          params: {
            $ctx: ctx?.request?.data?.$ctx,
            method,
            data: ctx.request.data.params,
            session: { origin, name, icon },
          },
          origin,
        },
        { height: windowHeight }
      );
      if (isSignApproval(approvalType)) {
        permissionService.updateConnectSite(origin, { isSigned: true }, true);
      } else {
        permissionService.touchConnectedSite(origin);
      }
    }

    return next();
  })
  .use(async (ctx) => {
    const { approvalRes, mapMethod, request } = ctx;
    // process request
    const [approvalType] =
      Reflect.getMetadata('APPROVAL', providerController, mapMethod) || [];
    const { uiRequestComponent, ...rest } = approvalRes || {};
    const {
      session: { origin },
    } = request;
    const requestDeferFn = () =>
      new Promise((resolve, reject) => {
        return Promise.resolve(
          providerController[mapMethod]({
            ...request,
            approvalRes,
          })
        )
          .then((result) => {
            if (isSignApproval(approvalType)) {
              eventBus.emit(EVENTS.broadcastToUI, {
                method: EVENTS.SIGN_FINISHED,
                params: {
                  success: true,
                  data: result,
                },
              });
            }
            return result;
          })
          .then(resolve)
          .catch((e: any) => {
            if (isSignApproval(approvalType)) {
              eventBus.emit(EVENTS.broadcastToUI, {
                method: EVENTS.SIGN_FINISHED,
                params: {
                  success: false,
                  errorMsg: e?.message || JSON.stringify(e),
                },
              });
            }
          });
      });
    notificationService.setCurrentRequestDeferFn(requestDeferFn);
    const requestDefer = requestDeferFn();
    async function requestApprovalLoop({ uiRequestComponent, ...rest }) {
      ctx.request.requestedApproval = true;
      const res = await notificationService.requestApproval({
        approvalComponent: uiRequestComponent,
        params: rest,
        origin,
        approvalType,
        isUnshift: true,
      });
      if (res.uiRequestComponent) {
        return await requestApprovalLoop(res);
      } else {
        return res;
      }
    }
    if (uiRequestComponent) {
      ctx.request.requestedApproval = true;
      return await requestApprovalLoop({ uiRequestComponent, ...rest });
    }

    return requestDefer;
  })
  .callback();

export default (request: ProviderRequest) => {
  const ctx: any = { request: { ...request, requestedApproval: false } };
  return flowContext(ctx).finally(() => {
    if (ctx.request.requestedApproval) {
      flow.requestedApproval = false;
      // only unlock notification if current flow is an approval flow
      notificationService.unLock();
      keyringService.resetResend();
    }
  });
};
