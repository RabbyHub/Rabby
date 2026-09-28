import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTx } from '@rabby-wallet/rabby-bridge';
import type { SelectedBridgeQuote } from '@/ui/views/Bridge/hooks';
import {
  buildBridgeQuoteTxParams,
  buildBridgeTokenSideParams,
  getBridgeQuoteStatsParams,
} from '@/ui/views/Bridge/utils/submit';

jest.mock('@/stats', () => ({
  report: jest.fn(),
}));

jest.mock('@/utils/chain', () => ({
  findChain: ({ serverId }: { serverId: string }) =>
    serverId === 'eth' ? { id: 1 } : { id: 56 },
}));

jest.mock(
  '@rabby-wallet/rabby-bridge',
  () => ({
    buildTx: jest.fn(),
  }),
  { virtual: true }
);

const token = (overrides: Partial<TokenItem> = {}): TokenItem =>
  (({
    id: '0xtoken',
    chain: 'eth',
    decimals: 6,
    ...overrides,
  } as unknown) as TokenItem);

const quote = (): SelectedBridgeQuote =>
  (({
    aggregator: { id: 'lifi' },
    bridge_id: 'stargate',
    to_token_amount: '10',
    duration: 90,
    approve_contract_id: '0xapprove',
    shouldApproveToken: true,
    shouldTwoStepApprove: false,
    quote_key: { k: 1 },
    rabby_fee: { usd_value: 0.2 },
  } as unknown) as SelectedBridgeQuote);

describe('bridge submit helpers', () => {
  it('builds quote tx params from the selected quote', () => {
    expect(
      buildBridgeQuoteTxParams({
        userAddress: '0xuser',
        fromToken: token(),
        toToken: token({ id: '0xto', chain: 'bsc' }),
        amount: '1.5',
        slippage: '1',
        quote: quote(),
      })
    ).toEqual({
      bridgeId: 'stargate',
      userAddress: '0xuser',
      fromChainId: 'eth',
      fromTokenId: '0xtoken',
      fromTokenRawAmount: '1500000',
      toChainId: 'bsc',
      toTokenId: '0xto',
      slippage: '0.01',
      quoteKey: { k: 1 },
    });
  });

  it('reports quote identity in stats params', () => {
    expect(
      getBridgeQuoteStatsParams(
        quote(),
        token(),
        token({ id: '0xto', chain: 'bsc' }),
        'fail'
      )
    ).toEqual({
      aggregatorIds: 'lifi',
      bridgeId: 'stargate',
      fromChainId: 'eth',
      fromTokenId: '0xtoken',
      toTokenId: '0xto',
      toChainId: 'bsc',
      status: 'fail',
    });
  });

  it('builds token-side submit params and local history payload', () => {
    const tx = ({
      to: '0xrouter',
      value: '0x0',
      data: '0xabc',
      chainId: 1,
      from: '0xuser',
      gasLimit: '0x5208',
      gasPrice: '0x1',
    } as unknown) as BridgeTx;
    const result = buildBridgeTokenSideParams({
      userAddress: '0xuser',
      fromToken: token(),
      toToken: token({ id: '0xto', chain: 'bsc' }),
      amount: '1.5',
      feeRate: 0.003,
      slippage: '1',
      quote: quote(),
      tx,
      gasPrice: 12,
    });

    expect(result.approveId).toBe('0xapprove');
    expect(result.payTokenRawAmount).toBe('1500000');
    expect(result.shouldApprove).toBe(true);
    expect(result.info.slippage).toBe(0.01);
    expect(result.info.aggregator_id).toBe('lifi');
    expect(result.addHistoryData).toMatchObject({
      address: '0xuser',
      fromChainId: 1,
      toChainId: 56,
      fromAmount: 1.5,
      toAmount: 10,
      slippage: 0.01,
      dexId: 'lifi',
      status: 'pending',
    });
  });
});
