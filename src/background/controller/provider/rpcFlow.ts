import { ethErrors } from 'eth-rpc-errors';
import {
  keyringService,
  notificationService,
  permissionService,
  preferenceService,
} from 'background/service';
import { PromiseFlow, underline2Camelcase } from 'background/utils';
import { CHAINS, EVENTS, INTERNAL_REQUEST_ORIGIN } from 'consts';
import providerController from './controller';
import eventBus from '@/eventBus';
import { resemblesETHAddress } from '@/utils';
import { ProviderRequest } from './type';
import * as Sentry from '@sentry/browser';
import stats from '@/stats';
import { addHexPrefix, stripHexPrefix } from '@ethereumjs/util';
import { findChain } from '@/utils/chain';
import { waitSignComponentAmounted } from '@/utils/signEvent';
import { gnosisController } from './gnosisController';
import { Account } from '@/background/service/preference';

const isSignApproval = (type: string) => {
  const SIGN_APPROVALS = ['SignText', 'SignTypedData', 'SignTx'];
  return SIGN_APPROVALS.includes(type);
};

const lockedOrigins = new Set<string>();
const connectOrigins = new Set<string>();

const getScreenAvailHeight = async () => {
  return 1000;
};

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
        data,
      },
    } = ctx;

    if (!Reflect.getMetadata('SAFE', providerController, mapMethod)) {
      // check lock
      const isUnlock = keyringService.memStore.getState().isUnlocked;
      const isConnected = permissionService.hasPermission(origin);
      const hasOtherProvider = !!data?.$ctx?.providers?.length;

      /**
       * if not connected and has other provider ignore lock check
       */
      if (!isConnected && hasOtherProvider) {
        return next();
      }
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
        data,
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
          const isUnlock = keyringService.memStore.getState().isUnlocked;
          const {
            defaultChain,
            defaultAccount,
          } = await notificationService.requestApproval(
            {
              params: { origin, name, icon, $ctx: data.$ctx },
              account: ctx.request.account,
              approvalComponent: 'Connect',
            },
            { height: isUnlock ? 800 : 628 }
          );
          const isEnabledDappAccount = preferenceService.getPreference(
            'isEnabledDappAccount'
          );
          if (!isEnabledDappAccount) {
            preferenceService.setCurrentAccount(defaultAccount);
          }
          connectOrigins.delete(origin);
          permissionService.addConnectedSiteV2({
            origin,
            name,
            icon,
            defaultChain,
            defaultAccount: isEnabledDappAccount
              ? defaultAccount || preferenceService.getCurrentAccount()
              : undefined,
          });
          ctx.request.account = defaultAccount;
        } catch (e) {
          console.error(e);
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
      const screenAvailHeight = await getScreenAvailHeight();
      if (screenAvailHeight < 880) {
        windowHeight = screenAvailHeight;
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
      const hexReg = /^[0-9A-Fa-f]+$/gu;
      const stripped = stripHexPrefix(message);
      if (stripped.match(hexReg)) {
        message = addHexPrefix(stripped);
      }
      ctx.request.data.params[0] = message;
      ctx.request.data.params[1] = from;
    }
    if (approvalType && (!condition || !condition(ctx.request))) {
      ctx.request.requestedApproval = true;
      if (approvalType === 'SignTx' && !('chainId' in params[0])) {
        const site = permissionService.getConnectedSite(origin);
        if (site) {
          const chain = findChain({
            enum: site.chain,
          });
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
          account: ctx.request.account,
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
        let waitSignComponentPromise = Promise.resolve();
        if (isSignApproval(approvalType) && uiRequestComponent) {
          waitSignComponentPromise = waitSignComponentAmounted();
        }

        // if (approvalRes?.isGnosis && !approvalRes.safeMessage) {
        //   return resolve(undefined);
        // }
        if (approvalRes?.isGnosis) {
          return resolve(undefined);
        }

        return waitSignComponentPromise.then(() =>
          Promise.resolve(
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
              console.error(e);
              const payload = {
                method: EVENTS.SIGN_FINISHED,
                params: {
                  success: false,
                  errorMsg: e?.message || JSON.stringify(e),
                },
              };
              if (e.method) {
                payload.method = e.method;
                payload.params = e.message;
              }

              Sentry.captureException(e);
              if (isSignApproval(approvalType)) {
                eventBus.emit(EVENTS.broadcastToUI, payload);
              }
              reject(e);
            })
        );
      });

    if (!approvalRes?.isGnosis) {
      notificationService.setCurrentRequestDeferFn(requestDeferFn);
    }
    const requestDefer = requestDeferFn();
    async function requestApprovalLoop({
      uiRequestComponent,
      $account,
      ...rest
    }) {
      ctx.request.requestedApproval = true;
      const res = await notificationService.requestApproval({
        approvalComponent: uiRequestComponent,
        params: rest,
        account: $account,
        origin,
        approvalType,
        isUnshift: true,
      });
      if (res?.uiRequestComponent) {
        return await requestApprovalLoop(res);
      } else {
        return res;
      }
    }

    if (uiRequestComponent) {
      ctx.request.requestedApproval = true;
      const result = await requestApprovalLoop({ uiRequestComponent, ...rest });
      reportStatsData();
      if (rest?.safeMessage) {
        const safeMessage: {
          safeAddress: string;
          message: string | Record<string, any>;
          chainId: number;
          safeMessageHash: string;
        } = rest.safeMessage;
        if (ctx.request.requestedApproval) {
          flow.requestedApproval = false;
          // only unlock notification if current flow is an approval flow
          notificationService.unLock();
        }
        return gnosisController.watchMessage({
          address: safeMessage.safeAddress,
          chainId: safeMessage.chainId,
          safeMessageHash: safeMessage.safeMessageHash,
        });
      } else {
        return result;
      }
    }

    return requestDefer;
  })
  .callback();

function reportStatsData() {
  const statsData = notificationService.getStatsData();

  if (!statsData || statsData.reported) return;

  if (statsData?.signed) {
    const sData: any = {
      type: statsData?.type,
      chainId: statsData?.chainId,
      category: statsData?.category,
      success: statsData?.signedSuccess,
      preExecSuccess: statsData?.preExecSuccess,
      createdBy: statsData?.createdBy,
      source: statsData?.source,
      trigger: statsData?.trigger,
      networkType: statsData?.networkType,
    };
    if (statsData.signMethod) {
      sData.signMethod = statsData.signMethod;
    }
    stats.report('signedTransaction', sData);
  }
  if (statsData?.submit) {
    stats.report('submitTransaction', {
      type: statsData?.type,
      chainId: statsData?.chainId,
      category: statsData?.category,
      success: statsData?.submitSuccess,
      preExecSuccess: statsData?.preExecSuccess,
      createdBy: statsData?.createdBy,
      source: statsData?.source,
      trigger: statsData?.trigger,
      networkType: statsData?.networkType || '',
    });
  }

  statsData.reported = true;

  notificationService.setStatsData(statsData);
}

export default (request: ProviderRequest) => {
  const origin = request.session?.origin || request.origin;
  let account: Account | undefined = undefined;
  if (preferenceService.getPreference('isEnabledDappAccount')) {
    if (origin) {
      if (origin === INTERNAL_REQUEST_ORIGIN) {
        account =
          request.account || preferenceService.getCurrentAccount() || undefined;
      } else {
        const site = permissionService.getConnectedSite(origin);
        if (site?.isConnected) {
          account =
            site.account || preferenceService.getCurrentAccount() || undefined;
        }
      }
    }
  } else {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      account =
        request.account || preferenceService.getCurrentAccount() || undefined;
    } else {
      account = preferenceService.getCurrentAccount() || undefined;
    }
  }

  const ctx: any = {
    request: { ...request, account, requestedApproval: false },
  };
  notificationService.setStatsData();
  return flowContext(ctx).finally(() => {
    reportStatsData();

    if (ctx.request.requestedApproval) {
      flow.requestedApproval = false;
      // only unlock notification if current flow is an approval flow
      notificationService.unLock();
    }
  });
};
