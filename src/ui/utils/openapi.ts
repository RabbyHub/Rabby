import type { WalletControllerType } from '@/ui/utils';
import { IExtractFromPromise } from '@/ui/utils/type';

type IOpenAPIClient = WalletControllerType['openapi'];
type AllKeysOnOpenAPI = keyof IOpenAPIClient;
type AllMethodNamesOnOpenAPI = {
  [P in AllKeysOnOpenAPI]: Exclude<IOpenAPIClient[P], undefined> extends (
    ...args: any[]
  ) => any
    ? P
    : never;
}[AllKeysOnOpenAPI];

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
  const { wallet } = options || {};
  // `isTestnet` remains in the options for call-site compatibility; the
  // standalone testnet client has been removed, so all requests share OpenAPI.
  return request({ wallet, openapi: wallet.openapi });
}
