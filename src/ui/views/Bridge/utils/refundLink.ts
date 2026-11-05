import { getTxScanLink } from '@/utils';
import { findChain } from '@/utils/chain';

export const getBridgeRefundHref = (txId?: string, chainServerId?: string) => {
  if (!txId) return '';
  const chain = findChain({ serverId: chainServerId });
  return chain?.scanLink ? getTxScanLink(chain.scanLink, txId) : '';
};
