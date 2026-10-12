import {
  CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
  ItemType,
  OPENSEA_CONDUIT_KEY,
} from '@opensea/seaport-js/lib/constants';
import * as Sentry from '@sentry/browser';
import i18next from 'i18next';
import { encodeFunctionData, zeroAddress, zeroHash } from 'viem';
import { SeaportABI } from '@/constant/abi';
import { cloneDeep } from 'lodash';
import matchFixture from '../fixtures/nft/seaport-match-advanced-orders.json';
import enMessages from '../../_raw/locales/en/messages.json';
import zhCNMessages from '../../_raw/locales/zh-CN/messages.json';
import { buildCreateListingTypedData } from '@/utils/nft';
import {
  calcMinReceiveAmount,
  getNFTTradingCurrency,
  NFTOrderVerifyError,
  reportNFTOrderVerifyError,
  verifyAcceptOfferTx,
  verifyCreateListingTypedData,
} from '@/utils/nftVerify';

jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

const ACCOUNT = '0x1111111111111111111111111111111111111111';
const ATTACKER = '0x9999999999999999999999999999999999999999';
const OFFERER = '0x2222222222222222222222222222222222222222';
const NFT = '0x3333333333333333333333333333333333333333';
const OTHER_NFT = '0x4444444444444444444444444444444444444444';
const FAKE_TOKEN = '0x5555555555555555555555555555555555555555';
const OS_FEE = '0x0000a26b00c1f0df003000390027140000faa719';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const ONE_ETH = BigInt('1000000000000000000');

const expectVerifyError = (fn: () => unknown, reason: string) => {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(NFTOrderVerifyError);
  expect((error as NFTOrderVerifyError).reason).toContain(reason);
  // survives the background -> UI message channel
  expect((error as NFTOrderVerifyError).data.reason).toContain(reason);
};

describe('NFTOrderVerifyError', () => {
  it('falls back to the English reason when i18n is not ready', () => {
    const error = new NFTOrderVerifyError('some reason');
    expect(error.category).toBe('invalid');
    expect(error.message).toContain('some reason');
  });

  it('localizes the message by category', async () => {
    await i18next.init({
      lng: 'zh-CN',
      fallbackLng: 'en',
      defaultNS: 'translations',
      resources: {
        en: { translations: enMessages },
        'zh-CN': { translations: zhCNMessages },
      },
    });
    const error = new NFTOrderVerifyError(
      'received amount is too low',
      'amount'
    );
    expect(error.category).toBe('amount');
    expect(error.message).toBe(
      zhCNMessages.page.desktopProfile.nft.verifyError.amount
    );
  });
});

describe('getNFTTradingCurrency', () => {
  it('accepts pinned currencies and rejects anything else', () => {
    expect(
      getNFTTradingCurrency(1, 'listing', { id: 'eth', decimals: 18 }).id
    ).toBe('eth');
    expect(getNFTTradingCurrency(1, 'offer', { id: WETH }).id).toBe(WETH);
    expectVerifyError(
      () => getNFTTradingCurrency(1, 'offer', { id: FAKE_TOKEN }),
      'unexpected offer currency'
    );
    expectVerifyError(
      () => getNFTTradingCurrency(1, 'listing', { id: 'eth', decimals: 6 }),
      'decimals'
    );
    expectVerifyError(
      () => getNFTTradingCurrency(56, 'listing'),
      'not supported'
    );
  });
});

describe('calcMinReceiveAmount', () => {
  it('uses an absolute tolerance that does not scale with trade value', () => {
    const gross = ONE_ETH * BigInt(100);
    const net = (gross * BigInt(9900)) / BigInt(10000);
    expect(
      calcMinReceiveAmount({ gross, feeBps: 100, toleranceWei: BigInt(2) })
    ).toBe(net - BigInt(2));
    expect(calcMinReceiveAmount({ gross, feeBps: 100 })).toBe(net);
  });
});

describe('verifyCreateListingTypedData', () => {
  const nft = { contract: NFT, tokenId: '42', amount: 1, isErc721: true };
  const totalPrice = ONE_ETH;
  const build = (
    overrides: Partial<Parameters<typeof buildCreateListingTypedData>[0]> = {}
  ) =>
    buildCreateListingTypedData({
      chainId: 1,
      nftId: '42',
      nftContractId: NFT,
      nftAmount: 1,
      tokenId: 'eth',
      listingPriceInWei: totalPrice.toString(),
      sellerAddress: ACCOUNT,
      marketFees: [{ recipient: OS_FEE, fee: 100, required: true }],
      royaltyFees: [],
      endTime: String(Math.floor(Date.now() / 1000) + 3600),
      isErc721: true,
      counter: 0,
      ...overrides,
    });
  const verify = (typedData: any, feeBps = 100) =>
    verifyCreateListingTypedData({
      typedData,
      chainId: 1,
      account: ACCOUNT,
      nft,
      currencyId: 'eth',
      totalPrice,
      minReceiveAmount: calcMinReceiveAmount({ gross: totalPrice, feeBps }),
    });

  it('passes for a locally built listing', () => {
    const res = verify(build());
    expect(res.received).toBe((ONE_ETH * BigInt(99)) / BigInt(100));
  });

  it('rejects fees above what the user saw', () => {
    const typedData = build({
      marketFees: [{ recipient: ATTACKER, fee: 5000, required: true }],
    });
    expectVerifyError(() => verify(typedData), 'received amount is too low');
  });

  it('rejects a swapped currency', () => {
    const typedData = build({ tokenId: FAKE_TOKEN });
    expectVerifyError(() => verify(typedData), 'consideration');
  });

  it('rejects a declining (dutch) price', () => {
    const typedData = build();
    typedData.message.consideration[0].endAmount = '0';
    expectVerifyError(() => verify(typedData), 'must be fixed');
  });

  it('rejects a different NFT or amount', () => {
    expectVerifyError(
      () => verify(build({ nftContractId: OTHER_NFT })),
      'NFT contract mismatch'
    );
    expectVerifyError(() => verify(build({ nftId: '43' })), 'NFT id mismatch');
    const extra = build();
    extra.message.offer.push({ ...extra.message.offer[0], token: OTHER_NFT });
    expectVerifyError(() => verify(extra), 'exactly one NFT');
  });

  it('rejects a wrong domain or offerer', () => {
    const wrongChain = build({ chainId: 8453 });
    expectVerifyError(() => verify(wrongChain), 'chainId');
    const wrongContract = build();
    wrongContract.domain.verifyingContract = ATTACKER;
    expectVerifyError(() => verify(wrongContract), 'verifying contract');
    const wrongOfferer = build({ sellerAddress: ATTACKER });
    expectVerifyError(() => verify(wrongOfferer), 'offerer');
  });

  it('rejects a changed total price', () => {
    const typedData = build({
      listingPriceInWei: (ONE_ETH / BigInt(2)).toString(),
    });
    expectVerifyError(() => verify(typedData, 0), 'listing price mismatch');
  });
});

describe('verifyAcceptOfferTx', () => {
  const nft = { contract: NFT, tokenId: '42', quantity: 1 };
  // one displayed fee item -> 1 wei rounding tolerance
  const minReceiveAmount = calcMinReceiveAmount({
    gross: ONE_ETH,
    feeBps: 100,
    toleranceWei: BigInt(1),
  });
  const fee = ONE_ETH / BigInt(100);

  const basicParams = (overrides: Record<string, unknown> = {}) => ({
    considerationToken: NFT,
    considerationIdentifier: BigInt(42),
    considerationAmount: BigInt(1),
    offerer: OFFERER,
    zone: zeroAddress,
    offerToken: WETH,
    offerIdentifier: BigInt(0),
    offerAmount: ONE_ETH,
    // BasicOrderRouteType.ERC721_TO_ERC20 * 4 + OrderType.FULL_OPEN
    basicOrderType: 16,
    startTime: BigInt(0),
    endTime: BigInt(2) ** BigInt(40),
    zoneHash: zeroHash,
    salt: BigInt(1),
    offererConduitKey: OPENSEA_CONDUIT_KEY,
    fulfillerConduitKey: OPENSEA_CONDUIT_KEY,
    totalOriginalAdditionalRecipients: BigInt(1),
    additionalRecipients: [{ amount: fee, recipient: OS_FEE }],
    signature: '0x',
    ...overrides,
  });

  const basicTx = (overrides?: Record<string, unknown>) => ({
    to: CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
    value: 0,
    data: encodeFunctionData({
      abi: SeaportABI as any,
      functionName: 'fulfillBasicOrder',
      args: [basicParams(overrides)],
    }),
  });

  const advancedTx = ({
    identifier = BigInt(42),
    recipient = zeroAddress,
    offerToken = WETH,
    feeAmount = fee,
  }: {
    identifier?: bigint;
    recipient?: string;
    offerToken?: string;
    feeAmount?: bigint;
  } = {}) => ({
    to: CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
    value: 0,
    data: encodeFunctionData({
      abi: SeaportABI as any,
      functionName: 'fulfillAdvancedOrder',
      args: [
        {
          parameters: {
            offerer: OFFERER,
            zone: zeroAddress,
            offer: [
              {
                itemType: ItemType.ERC20,
                token: offerToken,
                identifierOrCriteria: BigInt(0),
                startAmount: ONE_ETH * BigInt(2),
                endAmount: ONE_ETH * BigInt(2),
              },
            ],
            consideration: [
              {
                itemType: ItemType.ERC1155_WITH_CRITERIA,
                token: NFT,
                identifierOrCriteria: BigInt(0),
                startAmount: BigInt(2),
                endAmount: BigInt(2),
                recipient: OFFERER,
              },
              {
                itemType: ItemType.ERC20,
                token: offerToken,
                identifierOrCriteria: BigInt(0),
                startAmount: feeAmount * BigInt(2),
                endAmount: feeAmount * BigInt(2),
                recipient: OS_FEE,
              },
            ],
            orderType: 1,
            startTime: BigInt(0),
            endTime: BigInt(2) ** BigInt(40),
            zoneHash: zeroHash,
            salt: BigInt(1),
            conduitKey: OPENSEA_CONDUIT_KEY,
            totalOriginalConsiderationItems: BigInt(2),
          },
          numerator: BigInt(1),
          denominator: BigInt(2),
          signature: '0x',
          extraData: '0x',
        },
        [
          {
            orderIndex: BigInt(0),
            side: 1,
            index: BigInt(0),
            identifier,
            criteriaProof: [],
          },
        ],
        OPENSEA_CONDUIT_KEY,
        recipient,
      ],
    }),
  });

  const verify = (tx: any, overrides: Record<string, unknown> = {}) =>
    verifyAcceptOfferTx({
      tx,
      chainId: 1,
      account: ACCOUNT,
      nft,
      offerer: OFFERER,
      minReceiveAmount,
      ...overrides,
    });

  it('only tolerates a fixed wei rounding bound', () => {
    const withFee = (amount: bigint) =>
      basicTx({ additionalRecipients: [{ amount, recipient: OS_FEE }] });
    expect(verify(withFee(fee + BigInt(1))).received).toBe(minReceiveAmount);
    expectVerifyError(
      () => verify(withFee(fee + BigInt(2))),
      'received amount is too low'
    );
  });

  it('passes for a basic order', () => {
    expect(verify(basicTx()).received).toBe(ONE_ETH - fee);
  });

  it('passes for a partial criteria order', () => {
    expect(verify(advancedTx()).received).toBe(ONE_ETH - fee);
  });

  // fulfillOrder(order, fulfillerConduitKey) has no recipient argument
  const fulfillOrderTx = ({
    identifier = BigInt(42),
    offerToken = WETH,
  }: { identifier?: bigint; offerToken?: string } = {}) => ({
    to: CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
    value: 0,
    data: encodeFunctionData({
      abi: SeaportABI as any,
      functionName: 'fulfillOrder',
      args: [
        {
          parameters: {
            offerer: OFFERER,
            zone: zeroAddress,
            offer: [
              {
                itemType: ItemType.ERC20,
                token: offerToken,
                identifierOrCriteria: BigInt(0),
                startAmount: ONE_ETH,
                endAmount: ONE_ETH,
              },
            ],
            consideration: [
              {
                itemType: ItemType.ERC721,
                token: NFT,
                identifierOrCriteria: identifier,
                startAmount: BigInt(1),
                endAmount: BigInt(1),
                recipient: OFFERER,
              },
              {
                itemType: ItemType.ERC20,
                token: offerToken,
                identifierOrCriteria: BigInt(0),
                startAmount: fee,
                endAmount: fee,
                recipient: OS_FEE,
              },
            ],
            orderType: 0,
            startTime: BigInt(0),
            endTime: BigInt(2) ** BigInt(40),
            zoneHash: zeroHash,
            salt: BigInt(1),
            conduitKey: OPENSEA_CONDUIT_KEY,
            totalOriginalConsiderationItems: BigInt(2),
          },
          signature: '0x',
        },
        OPENSEA_CONDUIT_KEY,
      ],
    }),
  });

  it('passes for fulfillOrder', () => {
    expect(verify(fulfillOrderTx()).received).toBe(ONE_ETH - fee);
  });

  it('rejects a tampered fulfillOrder', () => {
    expectVerifyError(
      () => verify(fulfillOrderTx({ identifier: BigInt(7) })),
      'NFT id mismatch'
    );
    expectVerifyError(
      () => verify(fulfillOrderTx({ offerToken: FAKE_TOKEN })),
      'unexpected offer token'
    );
  });

  it('rejects a non-Seaport target or native value', () => {
    expectVerifyError(
      () => verify({ ...basicTx(), to: ATTACKER }),
      'unexpected contract'
    );
    expectVerifyError(() => verify({ ...basicTx(), value: 1 }), 'native token');
  });

  it('rejects receiving a different token', () => {
    expectVerifyError(
      () => verify(basicTx({ offerToken: FAKE_TOKEN })),
      'unexpected offer token'
    );
    expectVerifyError(
      () => verify(advancedTx({ offerToken: FAKE_TOKEN })),
      'unexpected offer token'
    );
  });

  it('rejects receiving less than displayed', () => {
    expectVerifyError(
      () =>
        verify(
          basicTx({
            additionalRecipients: [
              { amount: ONE_ETH / BigInt(2), recipient: ATTACKER },
            ],
          })
        ),
      'received amount is too low'
    );
    expectVerifyError(
      () => verify(advancedTx({ feeAmount: ONE_ETH / BigInt(10) })),
      'received amount is too low'
    );
  });

  it('rejects sending proceeds to someone else', () => {
    expectVerifyError(
      () => verify(advancedTx({ recipient: ATTACKER })),
      'recipient'
    );
  });

  it('rejects selling a different NFT', () => {
    expectVerifyError(
      () => verify(basicTx({ considerationIdentifier: BigInt(7) })),
      'NFT id mismatch'
    );
    expectVerifyError(
      () => verify(advancedTx({ identifier: BigInt(7) })),
      'NFT id mismatch'
    );
    expectVerifyError(
      () => verify(basicTx({ considerationToken: OTHER_NFT })),
      'NFT contract mismatch'
    );
    expectVerifyError(
      () => verify(basicTx({ considerationAmount: BigInt(2) })),
      'NFT quantity mismatch'
    );
  });

  it('rejects a non offer-acceptance route', () => {
    // ETH_TO_ERC721: the user would pay native token to buy a listing
    expectVerifyError(
      () => verify(basicTx({ basicOrderType: 0 })),
      'not an offer acceptance'
    );
  });

  it('rejects a different offerer', () => {
    expectVerifyError(
      () => verify(basicTx({ offerer: ATTACKER })),
      'offerer mismatch'
    );
  });
});

describe('verifyAcceptOfferTx matchAdvancedOrders', () => {
  // Real OpenSea response for selling 1 of a 2-unit ERC1155 offer on Polygon,
  // with fulfiller / offer maker addresses replaced by ACCOUNT / OFFERER.
  const MATCH_NFT = '0xdbc52cd5b8eda1a7bcbabb838ca927d23e3673e5';
  const MATCH_NFT_ID =
    '24708872285590753891201118773777317370184416942185790922';
  const POLYGON_WETH = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619';
  // 0.0001 WETH gross for 1 unit, 1% OpenSea fee, 1 fee item
  const matchMinReceive = calcMinReceiveAmount({
    gross: BigInt('100000000000000'),
    feeBps: 100,
    toleranceWei: BigInt(1),
  });

  const matchTx = (mutate?: (input: any) => void) => {
    const transaction = cloneDeep(matchFixture);
    const input = transaction.input_data;
    mutate?.(input);
    return {
      to: transaction.to,
      value: transaction.value,
      data: encodeFunctionData({
        abi: SeaportABI as any,
        functionName: 'matchAdvancedOrders',
        args: [
          input.orders,
          input.criteriaResolvers,
          input.fulfillments,
          input.recipient,
        ],
      }),
    };
  };
  const verifyMatch = (tx: any, overrides: Record<string, unknown> = {}) =>
    verifyAcceptOfferTx({
      tx,
      chainId: 137,
      account: ACCOUNT,
      nft: { contract: MATCH_NFT, tokenId: MATCH_NFT_ID, quantity: 1 },
      offerer: OFFERER,
      minReceiveAmount: matchMinReceive,
      ...overrides,
    });
  // order 1 is the order OpenSea built for the fulfiller
  const ownOrder = (input: any) => input.orders[1].parameters;

  it('passes for the real OpenSea payload', () => {
    const res = verifyMatch(matchTx());
    expect(res.token).toBe(POLYGON_WETH);
    expect(res.received).toBe(BigInt('99000000000000'));
  });

  it('rejects giving away more than the selected NFT', () => {
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            ownOrder(input).offer[0].startAmount = '2';
            ownOrder(input).offer[0].endAmount = '2';
          })
        ),
      'NFT quantity mismatch'
    );
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            ownOrder(input).offer.push({
              itemType: ItemType.ERC20,
              token: POLYGON_WETH,
              identifierOrCriteria: '0',
              startAmount: '1',
              endAmount: '1',
            });
          })
        ),
      'only give the selected NFT'
    );
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            ownOrder(input).offer[0].identifierOrCriteria = '7';
          })
        ),
      'NFT id mismatch'
    );
  });

  it('counts an extra order signed by the user as outflow', () => {
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            input.orders.push(cloneDeep(input.orders[1]));
          })
        ),
      'NFT quantity mismatch'
    );
  });

  it('rejects proceeds below what was shown', () => {
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            ownOrder(input).consideration[0].recipient = ATTACKER;
          })
        ),
      'received amount is too low'
    );
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            ownOrder(input).consideration[0].startAmount = '98000000000000';
            ownOrder(input).consideration[0].endAmount = '98000000000000';
          })
        ),
      'received amount is too low'
    );
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            ownOrder(input).consideration[0].token = FAKE_TOKEN;
          })
        ),
      'received amount is too low'
    );
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            ownOrder(input).consideration[0].endAmount = '0';
          })
        ),
      'must be fixed'
    );
  });

  it('rejects leftovers sent to someone else or an unknown offerer', () => {
    expectVerifyError(
      () =>
        verifyMatch(
          matchTx((input) => {
            input.recipient = ATTACKER;
          })
        ),
      'unspent recipient'
    );
    expectVerifyError(
      () => verifyMatch(matchTx(), { offerer: ATTACKER }),
      'offerer mismatch'
    );
  });

  it('still rejects other unsupported functions', () => {
    const tx = matchTx();
    expectVerifyError(
      () =>
        verifyMatch({
          ...tx,
          data: encodeFunctionData({
            abi: SeaportABI as any,
            functionName: 'incrementCounter',
            args: [],
          }),
        }),
      'unsupported function'
    );
  });
});

describe('reportNFTOrderVerifyError', () => {
  const captureException = Sentry.captureException as jest.Mock;
  beforeEach(() => captureException.mockClear());

  it('ignores errors that are not verification failures', () => {
    reportNFTOrderVerifyError(new Error('network'), { flow: 'acceptOffer' });
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reports a stable reason and tags without addresses', () => {
    reportNFTOrderVerifyError(
      new NFTOrderVerifyError('unsupported function', 'invalid'),
      {
        flow: 'acceptOffer',
        chainId: 137,
        functionName: 'fulfillAvailableAdvancedOrders(<script>)',
      }
    );
    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, hint] = captureException.mock.calls[0];
    expect(error.message).toBe(
      'NFT order verification failed: unsupported function'
    );
    expect(hint.tags).toEqual({
      nft_verify_flow: 'acceptOffer',
      nft_verify_category: 'invalid',
      nft_verify_function: 'fulfillAvailableAdvancedOrdersscript',
      chain_id: 137,
    });
    expect(hint.fingerprint).toEqual([
      'nft-order-verify',
      'acceptOffer',
      'invalid',
      'unsupported function',
      'fulfillAvailableAdvancedOrdersscript',
    ]);
    expect(JSON.stringify([error.message, hint])).not.toMatch(
      /0x[0-9a-f]{40}/i
    );
  });
});
