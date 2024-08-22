import { BatchSellNFTOrderAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionBatchSellNFT: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'sell_nft_list_order') {
    return {};
  }
  return {
    batchSellNFT: data.data as BatchSellNFTOrderAction,
  };
};
