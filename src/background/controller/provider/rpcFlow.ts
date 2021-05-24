import { ethErrors } from 'eth-rpc-errors';
import { keyringService, notification, permission } from 'background/service';
import { PromiseFlow, underline2Camelcase } from 'background/utils';
import providerController from './controller';

export default (req) =>
  new PromiseFlow()
    .use(async (ctx) => {
      // check method
      const {
        data: { method },
      } = ctx.request;
      ctx.mapMethod = underline2Camelcase(method);

      if (!providerController[ctx.mapMethod]) {
        throw ethErrors.rpc.methodNotFound({
          message: `method [${method}] doesn't has corresponding handler`,
          data: ctx.request.data,
        });
      }
    })
    .use(async () => {
      // check lock
      const isUnlock = keyringService.memStore.getState().isUnlocked;

      if (!isUnlock) {
        await notification.requestApproval({});
      }
    })
    .use(async (ctx) => {
      // check connect
      const {
        request: {
          session: { origin, name, icon },
        },
      } = ctx;
      if (!permission.hasPerssmion(origin)) {
        const { defaultChain } = await notification.requestApproval({
          params: { origin, name, icon },
          aporovalComponent: 'Connect',
        });

        permission.addConnectedSite(origin, name, icon, defaultChain);
      }
    })
    .use(async (ctx) => {
      // check need approval
      const {
        request: {
          data: { params },
          session: { origin, name, icon },
        },
        mapMethod,
      } = ctx;
      const [approvalType, condition] =
        Reflect.getMetadata('APPROVAL', providerController, mapMethod) || [];

      if (approvalType && (!condition || !condition(ctx.request))) {
        ctx.approvalRes = await notification.requestApproval({
          aporovalComponent: approvalType,
          params: {
            data: params,
            session: { origin, name, icon },
          },
          origin,
        });

        permission.touchConnectedSite(origin);
      }
    })
    .use(async ({ approvalRes, mapMethod, request }) => {
      // process request
      const { uiRequestComponent, ...rest } = approvalRes || {};

      const requestDeffer = Promise.resolve(
        providerController[mapMethod](request)
      );

      if (uiRequestComponent) {
        return await notification.requestApproval({
          aporovalComponent: uiRequestComponent,
          requestDeffer,
          params: rest,
          origin,
        });
      }

      return requestDeffer;
    })
    .handle(req);
