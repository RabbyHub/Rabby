import type { WalletControllerType } from '@/ui/utils';
import { IExtractFromPromise } from '@/ui/utils/type';

type IOpenAPIClient =
  | WalletControllerType['openapi']
  | WalletControllerType['testnetOpenapi'];
type AllKeysOnOpenAPI = keyof IOpenAPIClient;
type AllMethodNamesOnOpenAPI = {
  [P in AllKeysOnOpenAPI]: Exclude<IOpenAPIClient[P], undefined> extends (
    ...args: any[]
  ) => any
    ? P
    : never;
}[AllKeysOnOpenAPI];

type ResultType<T> = {
  mainnet: T;
  testnet: T;
};
type IHandleResults<T, R = T> = (ctx: ResultType<T>) => R;
const defaultProcessResults = <T>(ctx: ResultType<T>) => {
  return ctx.mainnet;
};

export async function requestOpenApiMultipleNets<
  T extends IExtractFromPromise<
    ReturnType<Exclude<IOpenAPIClient[AllMethodNamesOnOpenAPI], undefined>>
  >,
  R = T
>(
  request: (ctx: {
    wallet: WalletControllerType;
    openapi: IOpenAPIClient;
  }) => Promise<T>,
  options: {
    wallet: WalletControllerType;
    fallbackValues: ResultType<T>;
    needTestnetResult?: boolean;
    processResults?: IHandleResults<T, R>;
  }
) {
  const {
    wallet,
    needTestnetResult = false,
    processResults = defaultProcessResults,
    fallbackValues,
  } = options || {};

  const mainnetOpenapi = wallet.openapi;
  const testnetOpenapi = wallet.testnetOpenapi;

  if (!needTestnetResult) {
    return request({ wallet, openapi: mainnetOpenapi });
  }

  const mainnetP = request({ wallet, openapi: mainnetOpenapi });
  const testnetP = request({ wallet, openapi: testnetOpenapi });

  return Promise.allSettled([mainnetP, testnetP]).then(([mainnet, testnet]) => {
    const mainResult =
      mainnet.status === 'fulfilled' ? mainnet.value : fallbackValues.mainnet;
    const testResult =
      testnet.status === 'fulfilled' ? testnet.value : fallbackValues.testnet;

    return processResults({
      mainnet: mainResult,
      testnet: testResult,
    });
  });
}

export async function requestOpenApiWithChainId<
  T extends IExtractFromPromise<
    ReturnType<Exclude<IOpenAPIClient[AllMethodNamesOnOpenAPI], undefined>>
  >
>(
  request: (ctx: {
    wallet: WalletControllerType;
    openapi: IOpenAPIClient;
  }) => Promise<T>,
  options: {
    wallet: WalletControllerType;
    isTestnet?: boolean;
  }
) {
  const { wallet, isTestnet = false } = options || {};

  const mainnetOpenapi = wallet.openapi;
  const testnetOpenapi = wallet.testnetOpenapi;

  if (!isTestnet) {
    return request({ wallet, openapi: mainnetOpenapi });
  }

  return request({ wallet, openapi: testnetOpenapi });
}
