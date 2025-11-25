import { isSameAddress } from '@/ui/utils';
import { randomBytes } from '@ethereumjs/util';
import {
  EIP_712_ORDER_TYPE,
  OPENSEA_CONDUIT_ADDRESS,
  SEAPORT_CONTRACT_NAME,
  SEAPORT_CONTRACT_VERSION_V1_6,
} from '@opensea/seaport-js/lib/constants';
import { CreateOrderInput } from '@opensea/seaport-js/lib/types';
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

interface CreateListingParams {
  // 基础信息
  offerer: string;
  chainId?: number;

  // NFT 信息
  nftContract: string;
  tokenId: string;
  itemType?: 2 | 3; // 2=ERC721, 3=ERC1155，默认 ERC721
  amount?: string; // 对于 ERC1155 的数量

  // 价格信息
  price: number; // ETH 价格
  currency?: string; // 支付代币地址，默认 ETH

  // 费用信息
  fees?: Array<{
    recipient: string;
    bps: number; // 费率，100 = 1%
  }>;

  // 订单设置
  startTime?: number; // 秒级时间戳，默认当前时间
  endTime?: number; // 秒级时间戳，默认当前时间+3小时
  salt?: string;
  conduitKey?: string;
  counter?: string;
}

// 工具函数
function calculateTime(
  offsetMinutes: number = 180
): { startTime: number; endTime: number } {
  const now = Math.floor(Date.now() / 1000);
  return {
    startTime: now,
    endTime: now + offsetMinutes * 60,
  };
}

// 主函数：构造签名数据
export function createSeaportSignatureData(params: CreateListingParams) {
  const {
    offerer,
    chainId = 1,
    nftContract,
    tokenId,
    itemType = 2, // 默认 ERC721
    amount = '1',
    price,
    currency = '0x0000000000000000000000000000000000000000', // 默认 ETH
    fees = [],
    startTime,
    endTime,
    salt = generateRandomSalt(),
    conduitKey = OPENSEA_CONDUIT_ADDRESS,
    counter = '0',
  } = params;

  const priceWei = new BigNumber(price).times(1e18);

  // 计算费用
  let totalFees = new BigNumber(0);
  const feeConsiderations = fees.map((fee) => {
    const feeAmount = priceWei
      .times(fee.bps)
      .div(10000)
      .integerValue(BigNumber.ROUND_DOWN);
    totalFees = totalFees.plus(feeAmount);

    return {
      itemType:
        currency === '0x0000000000000000000000000000000000000000' ? 0 : 1,
      token: currency,
      identifierOrCriteria: '0',
      startAmount: feeAmount.toString(),
      endAmount: feeAmount.toString(),
      recipient: fee.recipient,
    };
  });

  // 卖家收款金额
  const sellerAmount = priceWei.minus(totalFees);

  // 时间设置
  const time =
    startTime && endTime ? { startTime, endTime } : calculateTime(180);

  // 构造 offer
  const offer = [
    {
      itemType: itemType,
      token: nftContract,
      identifierOrCriteria: tokenId,
      startAmount: amount,
      endAmount: amount,
    },
  ];

  // 构造 consideration
  const consideration = [
    // 卖家收款
    {
      itemType:
        currency === '0x0000000000000000000000000000000000000000' ? 0 : 1,
      token: currency,
      identifierOrCriteria: '0',
      startAmount: sellerAmount.toString(),
      endAmount: sellerAmount.toString(),
      recipient: offerer,
    },
    // 费用收款方
    ...feeConsiderations,
  ];

  // 构造签名数据
  const signatureData = {
    domain: {
      name: SEAPORT_CONTRACT_NAME,
      version: '1.6',
      chainId: chainId,
      verifyingContract: SEAPORT_CONTRACT_VERSION_V1_6,
    },
    message: {
      offerer: offerer,
      zone: '0x0000000000000000000000000000000000000000',
      offer: offer,
      consideration: consideration,
      orderType: 0, // FULL_OPEN
      startTime: time.startTime.toString(),
      endTime: time.endTime.toString(),
      zoneHash:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: salt,
      conduitKey: conduitKey,
      counter: counter,
    },
    primaryType: 'OrderComponents' as const,
    types: EIP_712_ORDER_TYPE,
  };

  return signatureData;
}

export const buildCreateListingTypedData = (order: CreateOrderInput) => {};
