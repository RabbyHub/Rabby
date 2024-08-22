import { SellNFTOrderAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionSellNFT: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'sell_nft_order') {
    return {};
  }
  return {
    sellNFT: data.data as SellNFTOrderAction,
  };
};
