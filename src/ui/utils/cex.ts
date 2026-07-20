import type { AddrDescResponse, Cex } from '@rabby-wallet/rabby-api/dist/types';

import type { IExchange } from '@/ui/component/CexSelect';

export const findSupportedExchange = (
  exchanges: IExchange[],
  cexId?: string
): IExchange | null => {
  if (!cexId) {
    return null;
  }

  return (
    exchanges.find(
      (exchange) => exchange.id.toLowerCase() === cexId.toLowerCase()
    ) || null
  );
};

export const resolveSupportedDepositExchange = (
  detectedCex: Pick<Cex, 'id' | 'is_deposit'> | undefined,
  exchanges: IExchange[]
): IExchange | null => {
  if (!detectedCex?.is_deposit) {
    return null;
  }

  return findSupportedExchange(exchanges, detectedCex.id);
};

export const normalizeAddressDescCex = (
  desc: AddrDescResponse['desc'] | undefined,
  exchanges: IExchange[]
): AddrDescResponse['desc'] | undefined => {
  if (!desc) {
    return undefined;
  }

  const supportedExchange = resolveSupportedDepositExchange(
    desc.cex,
    exchanges
  );

  return {
    ...desc,
    cex: supportedExchange
      ? {
          id: supportedExchange.id,
          name: supportedExchange.name,
          logo_url: supportedExchange.logo,
          is_deposit: true,
        }
      : undefined,
  };
};
