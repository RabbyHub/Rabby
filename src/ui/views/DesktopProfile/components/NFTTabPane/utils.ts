import { isSameAddress } from '@/ui/utils';
import { NFTDetail } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';

export const calcBestOfferPrice = (nftDetail?: NFTDetail | null) => {
  if (!nftDetail || !nftDetail?.best_offer_order) {
    return null;
  }

  const offer = nftDetail.best_offer_order;

  const total = new BigNumber(offer.price.value).div(
    new BigNumber(10).exponentiatedBy(offer.price.decimals)
  );
  // todo 如果 startAmount 和 endAmount 不一样，应该怎么计算？
  const quantity = offer.protocol_data.parameters.consideration.find((item) => {
    return isSameAddress(item.token, nftDetail.contract_id);
  })?.endAmount;

  if (!quantity) {
    return null;
  }

  return total.div(quantity);
};
