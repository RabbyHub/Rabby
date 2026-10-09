import {
  CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
  ItemType,
  OPENSEA_CONDUIT_KEY,
} from '@opensea/seaport-js/lib/constants';
import i18next from 'i18next';
import { encodeFunctionData, zeroAddress, zeroHash } from 'viem';
import { SeaportABI } from '@/constant/abi';
import enMessages from '../../_raw/locales/en/messages.json';
import zhCNMessages from '../../_raw/locales/zh-CN/messages.json';
import { buildCreateListingTypedData } from '@/utils/nft';
import {
  calcMinReceiveAmount,
  getNFTTradingCurrency,
  NFTOrderVerifyError,
  verifyAcceptOfferTx,
  verifyCreateListingTypedData,
} from '@/utils/nftVerify';

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
  const minReceiveAmount = calcMinReceiveAmount({
    gross: ONE_ETH,
    feeBps: 100,
    toleranceBps: 1,
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
