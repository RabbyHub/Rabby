import { BuyNFTOrderAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionBuyNFT: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'buy_nft_order') {
    return {};
  }
  return {
    buyNFT: data.data as BuyNFTOrderAction,
  };
};
