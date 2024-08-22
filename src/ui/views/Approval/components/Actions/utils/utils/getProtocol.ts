import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';

export const getProtocol = (
  protocolMap: AddrDescResponse['desc']['protocol'],
  chainId: string
) => {
  if (!protocolMap) return null;
  if (protocolMap[chainId]) return protocolMap[chainId];
  return null;
};
