import { ExchangeClient } from '@rabby-wallet/hyperliquid-sdk/dist/client/exchange-client';
import { InfoClient } from '@rabby-wallet/hyperliquid-sdk/dist/client/info-client';

// Guards the patch-package patch that adds spot trading to the Hyperliquid SDK: the
// wire format must address spot pairs as asset 10000 + universe index.
describe('hyperliquid-sdk spot patch', () => {
  const setup = () => {
    const client = Object.create(ExchangeClient.prototype) as ExchangeClient;
    const exchange = jest.fn().mockResolvedValue({ status: 'ok' });
    const signL1Action = jest.fn().mockResolvedValue('signature');
    Object.assign(client, { httpClient: { exchange }, signL1Action });
    return { client, exchange, signL1Action };
  };

  it('builds a spot order action', async () => {
    const { client, exchange, signL1Action } = setup();
    await client.spotOrder({
      pairIndex: 107,
      isBuy: true,
      size: '1.50',
      limitPx: '40.4250',
      tif: 'Ioc',
    });
    const expectedAction = {
      type: 'order',
      orders: [
        {
          a: 10107,
          b: true,
          p: '40.425',
          s: '1.5',
          r: false,
          t: { limit: { tif: 'Ioc' } },
        },
      ],
      grouping: 'na',
    };
    expect(signL1Action).toHaveBeenCalledWith(
      expectedAction,
      expect.any(Number)
    );
    expect(exchange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expectedAction,
        signature: 'signature',
      })
    );
  });

  it('defaults to Gtc and rejects invalid pair indexes', async () => {
    const { client, signL1Action } = setup();
    await client.spotOrder({
      pairIndex: 0,
      isBuy: false,
      size: '100',
      limitPx: '0.2',
    });
    expect(signL1Action.mock.calls[0][0].orders[0]).toMatchObject({
      a: 10000,
      t: { limit: { tif: 'Gtc' } },
    });
    await expect(
      client.spotOrder({ pairIndex: -1, isBuy: true, size: '1', limitPx: '1' })
    ).rejects.toThrow('Invalid spot pair index');
  });

  it('builds a spot cancel action', async () => {
    const { client, signL1Action } = setup();
    await client.cancelSpotOrders([{ pairIndex: 107, oid: 42 }]);
    expect(signL1Action).toHaveBeenCalledWith(
      { type: 'cancel', cancels: [{ a: 10107, o: 42 }] },
      expect.any(Number)
    );
  });

  it('requests spot meta and pair contexts in one info call', async () => {
    const client = Object.create(InfoClient.prototype) as InfoClient;
    const info = jest
      .fn()
      .mockResolvedValue([{ tokens: [], universe: [] }, []]);
    Object.assign(client, { httpClient: { info } });
    await expect(client.getSpotMetaAndAssetCtxs()).resolves.toEqual([
      { tokens: [], universe: [] },
      [],
    ]);
    expect(info).toHaveBeenCalledWith({ type: 'spotMetaAndAssetCtxs' });
  });
});
