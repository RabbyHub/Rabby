import {
  CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
  ItemType,
  OPENSEA_CONDUIT_KEY,
  SEAPORT_CONTRACT_NAME,
  SEAPORT_CONTRACT_VERSION_V1_6,
  Side,
} from '@opensea/seaport-js/lib/constants';
import { SeaportABI } from '@/constant/abi';
import { t } from 'i18next';
import { decodeFunctionData, zeroAddress, zeroHash } from 'viem';

/**
 * Second-line checks for OpenSea (Seaport 1.6) orders built from backend data.
 *
 * The backend supplies the trading currency, fees and (for accepting offers)
 * the whole fulfillment calldata. Before anything is signed we re-check the
 * final payload against the user's intent: which NFT leaves the wallet, which
 * token comes back and at least how much of it. Every check fails closed.
 */

export type NFTOrderVerifyErrorCategory =
  | 'unsupportedChain'
  | 'currency'
  | 'nft'
  | 'amount'
  | 'recipient'
  | 'invalid';

export class NFTOrderVerifyError extends Error {
  // Detailed English reason for logs and tests; `message` is localized.
  reason: string;
  category: NFTOrderVerifyErrorCategory;
  // `data` survives the background -> UI message channel, the class does not
  data: { reason: string; category: NFTOrderVerifyErrorCategory };

  constructor(
    reason: string,
    category: NFTOrderVerifyErrorCategory = 'invalid'
  ) {
    super(
      t(`page.desktopProfile.nft.verifyError.${category}`) ||
        `NFT order verification failed: ${reason}`
    );
    this.name = 'NFTOrderVerifyError';
    this.reason = reason;
    this.category = category;
    this.data = { reason, category };
  }
}

export const OPENSEA_RESTRICTED_ZONE =
  '0x000056f7000000ece9003ca63978907a00ffd100';

const BPS_BASE = BigInt(10000);

type TradingCurrency = {
  // Rabby token id: native symbol id (e.g. `eth`) or the ERC20 address
  id: string;
  decimals: number;
};

// Pinned locally so a compromised trading config cannot swap in another token.
// Keyed by numeric chain id. Adding a chain here must be reviewed together
// with the backend trading config (`/v1/nft/trading_config`).
export const NFT_TRADING_CURRENCIES: Record<
  number,
  { listing: TradingCurrency; offer: TradingCurrency }
> = {
  // Ethereum
  1: {
    listing: { id: 'eth', decimals: 18 },
    offer: { id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18 },
  },
  // Polygon (bridged WETH)
  137: {
    listing: { id: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', decimals: 18 },
    offer: { id: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', decimals: 18 },
  },
  // Base
  8453: {
    listing: { id: 'base', decimals: 18 },
    offer: { id: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  // Arbitrum
  42161: {
    listing: { id: 'arb', decimals: 18 },
    offer: { id: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', decimals: 18 },
  },
};

const isSame = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

const toBigInt = (v: unknown, field: string) => {
  try {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') {
      if (!Number.isSafeInteger(v)) throw new Error();
      return BigInt(v);
    }
    if (typeof v === 'string' && v.trim() !== '') return BigInt(v);
  } catch (e) {
    // fallthrough
  }
  throw new NFTOrderVerifyError(`invalid ${field}`);
};

const assert: (
  cond: unknown,
  reason: string,
  category?: NFTOrderVerifyErrorCategory
) => asserts cond = (cond, reason, category) => {
  if (!cond) {
    throw new NFTOrderVerifyError(reason, category);
  }
};

const isErc20Address = (id: string) => /^0x[0-9a-fA-F]{40}$/.test(id);

export const getNFTTradingCurrency = (
  chainId: number,
  side: 'listing' | 'offer',
  token?: { id?: string; decimals?: number } | null
) => {
  const currency = NFT_TRADING_CURRENCIES[chainId]?.[side];
  assert(currency, `chain ${chainId} is not supported`, 'unsupportedChain');
  if (token) {
    assert(
      isSame(token.id, currency.id),
      `unexpected ${side} currency`,
      'currency'
    );
    assert(
      token.decimals === undefined || token.decimals === currency.decimals,
      `unexpected ${side} currency decimals`,
      'currency'
    );
  }
  return currency;
};

export const calcMinReceiveAmount = ({
  gross,
  feeBps,
  toleranceBps = 0,
}: {
  gross: bigint;
  feeBps: number;
  toleranceBps?: number;
}) => {
  assert(
    Number.isInteger(feeBps) && feeBps >= 0 && feeBps < 10000,
    'invalid fee',
    'amount'
  );
  const net = (gross * (BPS_BASE - BigInt(feeBps))) / BPS_BASE;
  const tolerance = (gross * BigInt(toleranceBps)) / BPS_BASE;
  return net > tolerance ? net - tolerance : BigInt(0);
};

/* -------------------------------------------------------------------------- */
/*                               Create listing                               */
/* -------------------------------------------------------------------------- */

type TypedOrderItem = {
  itemType: number | string;
  token: string;
  identifierOrCriteria: string | number;
  startAmount: string | number;
  endAmount: string | number;
  recipient?: string;
};

export const verifyCreateListingTypedData = ({
  typedData,
  chainId,
  account,
  nft,
  currencyId,
  totalPrice,
  minReceiveAmount,
  now = Date.now(),
}: {
  typedData: any;
  chainId: number;
  account: string;
  nft: {
    contract: string;
    tokenId: string;
    amount: number;
    isErc721: boolean;
  };
  currencyId: string;
  totalPrice: bigint;
  minReceiveAmount: bigint;
  now?: number;
}) => {
  getNFTTradingCurrency(chainId, 'listing', { id: currencyId });

  assert(typedData?.primaryType === 'OrderComponents', 'invalid primaryType');
  const domain = typedData?.domain || {};
  assert(domain.name === SEAPORT_CONTRACT_NAME, 'invalid domain name');
  assert(
    domain.version === SEAPORT_CONTRACT_VERSION_V1_6,
    'invalid domain version'
  );
  assert(
    toBigInt(domain.chainId, 'domain chainId') === BigInt(chainId),
    'invalid domain chainId'
  );
  assert(
    isSame(domain.verifyingContract, CROSS_CHAIN_SEAPORT_V1_6_ADDRESS),
    'invalid verifying contract'
  );

  const message = typedData?.message || {};
  assert(
    isSame(message.offerer, account),
    'offerer is not current account',
    'recipient'
  );
  assert(isSame(message.conduitKey, OPENSEA_CONDUIT_KEY), 'invalid conduit');
  assert(
    isSame(message.zone, zeroAddress) ||
      isSame(message.zone, OPENSEA_RESTRICTED_ZONE),
    'invalid zone'
  );
  assert(isSame(message.zoneHash, zeroHash), 'invalid zoneHash');
  const orderType = Number(message.orderType);
  assert(orderType >= 0 && orderType <= 3, 'invalid orderType');
  const startTime = toBigInt(message.startTime, 'startTime');
  const endTime = toBigInt(message.endTime, 'endTime');
  assert(
    endTime > BigInt(Math.floor(now / 1000)) && startTime < endTime,
    'invalid order time'
  );

  // What leaves the wallet: exactly the selected NFT, nothing else
  const offer: TypedOrderItem[] = message.offer || [];
  assert(offer.length === 1, 'offer must contain exactly one NFT', 'nft');
  const [nftItem] = offer;
  assert(
    Number(nftItem.itemType) ===
      (nft.isErc721 ? ItemType.ERC721 : ItemType.ERC1155),
    'invalid NFT item type',
    'nft'
  );
  assert(isSame(nftItem.token, nft.contract), 'NFT contract mismatch', 'nft');
  assert(
    toBigInt(nftItem.identifierOrCriteria, 'NFT id') ===
      toBigInt(nft.tokenId, 'NFT id'),
    'NFT id mismatch',
    'nft'
  );
  const nftStart = toBigInt(nftItem.startAmount, 'NFT amount');
  assert(
    nftStart === BigInt(nft.amount) &&
      nftStart === toBigInt(nftItem.endAmount, 'NFT amount'),
    'NFT amount mismatch',
    'nft'
  );

  // What the buyer pays: only the listing currency, fixed amounts
  const isNative = !isErc20Address(currencyId);
  const consideration: TypedOrderItem[] = message.consideration || [];
  assert(consideration.length > 0, 'empty consideration');
  let total = BigInt(0);
  let received = BigInt(0);
  consideration.forEach((item) => {
    assert(
      Number(item.itemType) === (isNative ? ItemType.NATIVE : ItemType.ERC20),
      'unexpected consideration item type',
      'currency'
    );
    assert(
      isSame(item.token, isNative ? zeroAddress : currencyId),
      'unexpected consideration token',
      'currency'
    );
    assert(
      toBigInt(item.identifierOrCriteria, 'identifier') === BigInt(0),
      'unexpected consideration identifier'
    );
    const amount = toBigInt(item.startAmount, 'consideration amount');
    assert(
      amount === toBigInt(item.endAmount, 'consideration amount'),
      'consideration amount must be fixed',
      'amount'
    );
    total += amount;
    if (isSame(item.recipient, account)) {
      received += amount;
    }
  });
  assert(
    isSame(consideration[0].recipient, account),
    'first consideration recipient is not current account',
    'recipient'
  );
  assert(total === totalPrice, 'listing price mismatch', 'amount');
  assert(received >= minReceiveAmount, 'received amount is too low', 'amount');

  return { total, received };
};

/* -------------------------------------------------------------------------- */
/*                                Accept offer                                */
/* -------------------------------------------------------------------------- */

type DecodedItem = {
  itemType: number;
  token: string;
  identifierOrCriteria: bigint;
  startAmount: bigint;
  endAmount: bigint;
  recipient?: string;
};

type DecodedOrderParameters = {
  offerer: string;
  offer: readonly DecodedItem[];
  consideration: readonly DecodedItem[];
};

type DecodedCriteriaResolver = {
  orderIndex: bigint;
  side: number;
  index: bigint;
  identifier: bigint;
};

const ACCEPT_OFFER_BASIC_ROUTES = {
  // BasicOrderRouteType.ERC721_TO_ERC20
  4: ItemType.ERC721,
  // BasicOrderRouteType.ERC1155_TO_ERC20
  5: ItemType.ERC1155,
} as Record<number, ItemType>;

type NormalizedFulfillment = {
  offerer: string;
  offerToken: string;
  // gross amount of offer token sent out by the order
  gross: bigint;
  // offer-token fees deducted from what the fulfiller keeps
  fees: bigint;
  nft: {
    itemType: number;
    token: string;
    identifier: bigint;
    amount: bigint;
    recipient: string;
  };
  recipient: string;
  fulfillerConduitKey: string;
};

const normalizeBasicOrder = (
  p: any,
  account: string
): NormalizedFulfillment => {
  const basicOrderType = Number(p.basicOrderType);
  const route = Math.floor(basicOrderType / 4);
  const nftType = ACCEPT_OFFER_BASIC_ROUTES[route];
  assert(nftType !== undefined, 'basic order is not an offer acceptance');

  let fees = BigInt(0);
  (p.additionalRecipients || []).forEach((item: any) => {
    fees += toBigInt(item.amount, 'fee amount');
  });

  return {
    offerer: p.offerer,
    offerToken: p.offerToken,
    gross: toBigInt(p.offerAmount, 'offer amount'),
    fees,
    nft: {
      itemType: nftType,
      token: p.considerationToken,
      identifier: toBigInt(p.considerationIdentifier, 'NFT id'),
      amount: toBigInt(p.considerationAmount, 'NFT amount'),
      recipient: p.offerer,
    },
    // basic orders always pay msg.sender
    recipient: account,
    fulfillerConduitKey: p.fulfillerConduitKey,
  };
};

const normalizeOrder = ({
  parameters,
  numerator,
  denominator,
  criteriaResolvers,
  recipient,
  fulfillerConduitKey,
  nftContract,
}: {
  parameters: DecodedOrderParameters;
  numerator: bigint;
  denominator: bigint;
  criteriaResolvers: readonly DecodedCriteriaResolver[];
  recipient: string;
  fulfillerConduitKey: string;
  nftContract: string;
}): NormalizedFulfillment => {
  assert(
    denominator > BigInt(0) &&
      numerator > BigInt(0) &&
      numerator <= denominator,
    'invalid fill fraction'
  );
  const applyFraction = (amount: bigint, field: string) => {
    assert(
      (amount * numerator) % denominator === BigInt(0),
      `inexact ${field} fraction`
    );
    return (amount * numerator) / denominator;
  };
  const fixedAmount = (item: DecodedItem, field: string) => {
    assert(
      item.startAmount === item.endAmount,
      `${field} must be fixed`,
      'amount'
    );
    return applyFraction(item.startAmount, field);
  };

  criteriaResolvers.forEach((r) => {
    assert(r.orderIndex === BigInt(0), 'invalid criteria resolver');
  });

  // What the fulfiller receives: only ERC20 of a single token
  const offer = parameters.offer || [];
  assert(offer.length > 0, 'empty offer');
  const offerToken = offer[0].token;
  let gross = BigInt(0);
  offer.forEach((item) => {
    assert(
      item.itemType === ItemType.ERC20,
      'offer item must be ERC20',
      'currency'
    );
    assert(isSame(item.token, offerToken), 'mixed offer tokens', 'currency');
    gross += fixedAmount(item, 'offer amount');
  });

  // What the fulfiller pays: the NFT, plus fees in the offer token
  let fees = BigInt(0);
  let nft: NormalizedFulfillment['nft'] | undefined;
  (parameters.consideration || []).forEach((item, index) => {
    if (item.itemType === ItemType.ERC20) {
      assert(
        isSame(item.token, offerToken),
        'unexpected fee token',
        'currency'
      );
      fees += fixedAmount(item, 'fee amount');
      return;
    }
    assert(
      [
        ItemType.ERC721,
        ItemType.ERC1155,
        ItemType.ERC721_WITH_CRITERIA,
        ItemType.ERC1155_WITH_CRITERIA,
      ].includes(item.itemType),
      'unexpected consideration item type',
      'currency'
    );
    assert(!nft, 'multiple NFTs requested', 'nft');
    assert(isSame(item.token, nftContract), 'NFT contract mismatch', 'nft');

    let identifier = item.identifierOrCriteria;
    const isCriteria =
      item.itemType === ItemType.ERC721_WITH_CRITERIA ||
      item.itemType === ItemType.ERC1155_WITH_CRITERIA;
    if (isCriteria) {
      const resolvers = criteriaResolvers.filter(
        (r) => r.side === Side.CONSIDERATION && r.index === BigInt(index)
      );
      assert(resolvers.length === 1, 'missing criteria resolver', 'nft');
      identifier = resolvers[0].identifier;
    }
    nft = {
      itemType:
        item.itemType === ItemType.ERC721_WITH_CRITERIA
          ? ItemType.ERC721
          : item.itemType === ItemType.ERC1155_WITH_CRITERIA
          ? ItemType.ERC1155
          : item.itemType,
      token: item.token,
      identifier,
      amount: fixedAmount(item, 'NFT amount'),
      recipient: item.recipient || '',
    };
  });
  assert(nft, 'no NFT requested', 'nft');

  return {
    offerer: parameters.offerer,
    offerToken,
    gross,
    fees,
    nft,
    recipient,
    fulfillerConduitKey,
  };
};

export const verifyAcceptOfferTx = ({
  tx,
  chainId,
  account,
  nft,
  offerer,
  minReceiveAmount,
}: {
  tx: { to: string; value?: unknown; data: `0x${string}` };
  chainId: number;
  account: string;
  nft: { contract: string; tokenId: string; quantity: number };
  offerer: string;
  minReceiveAmount: bigint;
}) => {
  const currency = getNFTTradingCurrency(chainId, 'offer');

  assert(
    isSame(tx.to, CROSS_CHAIN_SEAPORT_V1_6_ADDRESS),
    'unexpected contract'
  );
  assert(
    toBigInt(tx.value ?? 0, 'tx value') === BigInt(0),
    'tx must not send native token'
  );

  let decoded: { functionName: string; args?: readonly any[] };
  try {
    decoded = decodeFunctionData({ abi: SeaportABI, data: tx.data }) as any;
  } catch (e) {
    throw new NFTOrderVerifyError('cannot decode calldata');
  }
  const args = decoded.args || [];

  let fulfillment: NormalizedFulfillment;
  switch (decoded.functionName) {
    case 'fulfillBasicOrder':
      fulfillment = normalizeBasicOrder(args[0], account);
      break;
    case 'fulfillOrder':
      fulfillment = normalizeOrder({
        parameters: args[0].parameters,
        numerator: BigInt(1),
        denominator: BigInt(1),
        criteriaResolvers: [],
        fulfillerConduitKey: args[1],
        recipient: args[2],
        nftContract: nft.contract,
      });
      break;
    case 'fulfillAdvancedOrder':
      fulfillment = normalizeOrder({
        parameters: args[0].parameters,
        numerator: toBigInt(args[0].numerator, 'numerator'),
        denominator: toBigInt(args[0].denominator, 'denominator'),
        criteriaResolvers: args[1] || [],
        fulfillerConduitKey: args[2],
        recipient: args[3],
        nftContract: nft.contract,
      });
      break;
    default:
      throw new NFTOrderVerifyError(
        `unsupported function ${decoded.functionName}`
      );
  }

  assert(isSame(fulfillment.offerer, offerer), 'offerer mismatch');
  assert(
    isSame(fulfillment.fulfillerConduitKey, OPENSEA_CONDUIT_KEY) ||
      isSame(fulfillment.fulfillerConduitKey, zeroHash),
    'invalid fulfiller conduit'
  );
  assert(
    isSame(fulfillment.recipient, zeroAddress) ||
      isSame(fulfillment.recipient, account),
    'offer recipient is not current account',
    'recipient'
  );

  // The NFT that leaves the wallet
  assert(
    isSame(fulfillment.nft.token, nft.contract),
    'NFT contract mismatch',
    'nft'
  );
  assert(
    fulfillment.nft.identifier === toBigInt(nft.tokenId, 'NFT id'),
    'NFT id mismatch',
    'nft'
  );
  assert(
    fulfillment.nft.amount === BigInt(nft.quantity),
    'NFT quantity mismatch',
    'nft'
  );
  assert(
    isSame(fulfillment.nft.recipient, fulfillment.offerer),
    'NFT recipient is not the offerer'
  );

  // The token that comes back
  assert(
    isSame(fulfillment.offerToken, currency.id),
    'unexpected offer token',
    'currency'
  );
  assert(fulfillment.fees <= fulfillment.gross, 'fees exceed offer', 'amount');
  const received = fulfillment.gross - fulfillment.fees;
  assert(received >= minReceiveAmount, 'received amount is too low', 'amount');

  return {
    token: fulfillment.offerToken,
    gross: fulfillment.gross,
    fees: fulfillment.fees,
    received,
  };
};
