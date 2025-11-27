import { randomBytes } from '@ethereumjs/util';
import {
  CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
  EIP_712_ORDER_TYPE,
  ItemType,
  OPENSEA_CONDUIT_KEY,
  OrderType,
  SEAPORT_CONTRACT_NAME,
  SEAPORT_CONTRACT_VERSION_V1_6,
} from '@opensea/seaport-js/lib/constants';
import { OrderComponents } from '@opensea/seaport-js/lib/types';
import { NFTDetail } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import {
  concatHex,
  keccak256,
  padHex,
  serializeTypedData,
  sliceHex,
  stringToHex,
  toHex,
  zeroAddress,
  zeroHash,
} from 'viem';
const RESTRICTED_ZONE = '0x000056f7000000ece9003ca63978907a00ffd100';

export const calcBestOfferPrice = (nftDetail?: NFTDetail | null) => {
  if (!nftDetail || !nftDetail?.best_offer_order) {
    return null;
  }

  const offer = nftDetail.best_offer_order;

  const total = new BigNumber(offer.price.value).div(
    new BigNumber(10).exponentiatedBy(offer.price.decimals)
  );

  const quantity = offer.protocol_data.parameters.consideration.find((item) => {
    return item.token.toLowerCase() === nftDetail.contract_id.toLowerCase();
  })?.startAmount;

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

export const buildCreateListingTypedData = (params: {
  chainId: number;
  nftId: string;
  nftContractId: string;
  nftAmount: number;
  tokenId: string;
  listingPriceInWei: string;
  sellerAddress: string;
  marketFees: { recipient: string; fee: number; required: boolean }[];
  royaltyFees?: { recipient: string; fee: number; required: boolean }[];
  endTime: string;
  isErc721: boolean;
  counter?: number;
}) => {
  const {
    chainId,
    nftId,
    nftContractId,
    nftAmount,
    tokenId,
    listingPriceInWei,
    sellerAddress,
    marketFees,
    royaltyFees,
    endTime,
    isErc721,
    counter = 0,
  } = params;

  const priceWei = new BigNumber(listingPriceInWei);
  let totalFees = new BigNumber(0);
  const isCreatorFeeEnforced = royaltyFees?.find((item) => item.required);
  const feeConsiderations = [...marketFees, ...(royaltyFees || [])].map(
    (item) => {
      const feeAmount = priceWei
        .times(item.fee)
        .div(10000)
        .integerValue(BigNumber.ROUND_DOWN);
      totalFees = totalFees.plus(feeAmount);

      return {
        itemType: tokenId.startsWith('0x') ? ItemType.ERC20 : ItemType.NATIVE,
        token: tokenId.startsWith('0x') ? tokenId : zeroAddress,
        identifierOrCriteria: '0',
        startAmount: feeAmount.toString(),
        endAmount: feeAmount.toString(),
        recipient: item.recipient,
      };
    }
  );

  // 卖家收款金额
  const sellerAmount = priceWei.minus(totalFees);

  const orderComponents: Omit<
    OrderComponents,
    'totalOriginalConsiderationItems'
  > = {
    startTime: (Date.now() / 1000).toFixed(),
    endTime: endTime,
    offer: [
      {
        itemType: isErc721 ? ItemType.ERC721 : ItemType.ERC1155,
        identifierOrCriteria: nftId,
        startAmount: nftAmount.toString(),
        endAmount: nftAmount.toString(),
        token: nftContractId,
      },
    ],
    consideration: [
      {
        startAmount: sellerAmount.toString(),
        endAmount: sellerAmount.toString(),
        itemType: tokenId.startsWith('0x') ? ItemType.ERC20 : ItemType.NATIVE,
        recipient: sellerAddress,
        token: tokenId.startsWith('0x') ? tokenId : zeroAddress,
        identifierOrCriteria: '0',
      },
      ...feeConsiderations,
    ],
    zone: isCreatorFeeEnforced ? RESTRICTED_ZONE : zeroAddress,
    zoneHash: zeroHash,
    counter: counter,
    offerer: sellerAddress,
    orderType: isCreatorFeeEnforced
      ? nftAmount > 1
        ? OrderType.PARTIAL_RESTRICTED
        : OrderType.FULL_RESTRICTED
      : nftAmount > 1
      ? OrderType.PARTIAL_OPEN
      : OrderType.FULL_OPEN,
    salt: generateRandomSalt(),
    conduitKey: OPENSEA_CONDUIT_KEY,
  };

  const res = serializeTypedData({
    domain: {
      name: SEAPORT_CONTRACT_NAME,
      version: SEAPORT_CONTRACT_VERSION_V1_6,
      chainId: BigInt(chainId),
      verifyingContract: CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
    },
    message: orderComponents,
    primaryType: 'OrderComponents' as const,
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      ...EIP_712_ORDER_TYPE,
    },
  });
  return JSON.parse(res);
};
