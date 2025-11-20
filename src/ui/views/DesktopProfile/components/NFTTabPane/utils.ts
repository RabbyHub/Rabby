import { isSameAddress } from '@/ui/utils';
import { randomBytes } from '@ethereumjs/util';
import { NFTDetail } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import {
  concatHex,
  keccak256,
  stringToHex,
  toHex,
  padHex,
  sliceHex,
} from 'viem';

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

export const generateRandomSalt = (domain?: string) => {
  if (domain) {
    const domainHash = keccak256(stringToHex(domain));
    const prefix = sliceHex(domainHash, 0, 10); // 取前10个字符 (5字节)
    const zeros = padHex('0x', { size: 20 }); // 20字节的零
    const randomPart = toHex(randomBytes(8)); // 8字节随机数

    return concatHex([prefix, zeros, randomPart]);
  }

  return padHex(toHex(randomBytes(8)), { size: 32 }); // 8字节随机数填充到32字节
};
