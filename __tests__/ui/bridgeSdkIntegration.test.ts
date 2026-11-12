import * as Sentry from '@sentry/browser';
import type { SelectedBridgeQuote } from '@/ui/views/Bridge/hooks';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { requestBridgeQuoteTx } from '@/ui/views/Bridge/utils/submit';
import fixture from '../fixtures/bridge-relay-build.json';

jest.mock('@/utils/chain', () => ({ findChain: jest.fn() }));
jest.mock('@sentry/browser', () => ({ captureEvent: jest.fn() }));

const selectedQuote = {
  aggregator: { id: 'relay' },
  bridge_id: 'relay',
  quote_key: {},
  to_token_raw_amount_hex_str: `0x${BigInt(
    fixture.order_data.output.payments[0].expectedAmount
  ).toString(16)}`,
} as SelectedBridgeQuote;

const request = (tx: unknown, quote = selectedQuote) => {
  const buildBridgeTx = jest.fn().mockResolvedValue(tx);
  const params = {
    userAddress: fixture.params.userAddress,
    fromToken: {
      id: fixture.params.fromTokenId,
      chain: fixture.params.fromChainId,
      decimals: 6,
    } as TokenItem,
    toToken: {
      id: fixture.params.toTokenId,
      chain: fixture.params.toChainId,
      decimals: 6,
    } as TokenItem,
    amount: '4',
    slippage: '1',
    quote,
    openapi: ({ buildBridgeTx } as unknown) as Parameters<
      typeof requestBridgeQuoteTx
    >[0]['openapi'],
  };
  return { built: requestBridgeQuoteTx(params), buildBridgeTx };
};

describe('Bridge SDK business integration', () => {
  const captureEvent = Sentry.captureEvent as jest.Mock;
  beforeEach(() => {
    captureEvent.mockReset().mockReturnValue('event-id');
  });

  it('validates the backend transaction with its attached Relay order data', async () => {
    const tx = { ...fixture.tx, order_data: fixture.order_data };
    const { built, buildBridgeTx } = request(tx);
    await expect(built).resolves.toBe(tx);
    expect(buildBridgeTx).toHaveBeenCalledTimes(1);
    expect(captureEvent).not.toHaveBeenCalled();
  });

  it('blocks a changed order before transaction preparation and reports only once', async () => {
    const order = { ...fixture.order_data, salt: `0x${'ab'.repeat(32)}` };
    const { built, buildBridgeTx } = request({
      ...fixture.tx,
      order_data: order,
    });
    const prepareTransaction = jest.fn();
    await expect(built.then(prepareTransaction)).rejects.toThrow();
    expect(prepareTransaction).not.toHaveBeenCalled();
    expect(buildBridgeTx).toHaveBeenCalledTimes(1);
    expect(captureEvent).toHaveBeenCalledTimes(1);
    expect(captureEvent.mock.calls[0][0].tags).toMatchObject({
      bridge_error_code: 'BRIDGE_RELAY_ORDER_HASH_MISMATCH',
      bridge_blocking: 'true',
      bridge_operation: 'buildTx',
    });
  });

  it('reports a router rejection that does not invoke the SDK callback', async () => {
    const { built } = request({ ...fixture.tx, to: `0x${'11'.repeat(20)}` });
    await expect(built).rejects.toThrow();
    expect(captureEvent).toHaveBeenCalledTimes(1);
    expect(captureEvent.mock.calls[0][0].tags.bridge_error_code).toBe(
      'BRIDGE_ROUTER_NOT_ALLOWED'
    );
  });

  it('keeps a rejection blocking even if Sentry throws', async () => {
    captureEvent.mockImplementation(() => {
      throw new Error('reporter unavailable');
    });
    const { built } = request({ ...fixture.tx, to: `0x${'11'.repeat(20)}` });
    await expect(built).rejects.toThrow('Invalid bridge router');
  });
});
