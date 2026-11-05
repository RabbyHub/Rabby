import {
  applyCustomNetworkGas,
  getCustomNetworkEffectiveGasPrice,
  getCustomNetworkGasCost,
  hasValidCustomNetworkGasFields,
  resolveCustomGasPriorityFee,
} from '@/ui/views/Approval/components/SignTestnetTx/gas';

const GWEI = 1_000_000_000;
const tx = {
  chainId: 123456,
  data: '0x',
  from: '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf',
  to: '0x20c0000000000000000000000000000000000000',
  nonce: '0x0',
  value: '0x0',
  gasPrice: '0x1',
};

describe('applyCustomNetworkGas', () => {
  test('writes type-2 fee fields and drops gasPrice', () => {
    const next = applyCustomNetworkGas({
      tx,
      gas: { price: 16 * GWEI, priority_price: GWEI },
      support1559: true,
    });

    expect(next).not.toHaveProperty('gasPrice');
    expect(next.maxFeePerGas).toBe('0x3b9aca000');
    expect(next.maxPriorityFeePerGas).toBe('0x3b9aca00');
  });

  test('uses the full price as tip when the level has none', () => {
    const next = applyCustomNetworkGas({
      tx,
      gas: { price: GWEI, priority_price: null },
      support1559: true,
    });

    expect(next.maxPriorityFeePerGas).toBe(next.maxFeePerGas);
  });

  test('caps the tip at maxFee', () => {
    const next = applyCustomNetworkGas({
      tx,
      gas: { price: GWEI, priority_price: 2 * GWEI },
      support1559: true,
    });

    expect(next.maxPriorityFeePerGas).toBe('0x3b9aca00');
  });

  test('writes a legacy gasPrice and drops 1559 fields', () => {
    const next = applyCustomNetworkGas({
      tx: { ...tx, maxFeePerGas: '0x2', maxPriorityFeePerGas: '0x1' },
      gas: { price: GWEI, priority_price: GWEI / 2 },
      support1559: false,
    });

    expect(next.gasPrice).toBe('0x3b9aca00');
    expect(next).not.toHaveProperty('maxFeePerGas');
    expect(next).not.toHaveProperty('maxPriorityFeePerGas');
  });
});

describe('resolveCustomGasPriorityFee', () => {
  test.each([
    [
      'request with a tip keeps it',
      { fromRequest: true, requestPriorityFee: GWEI },
      GWEI,
    ],
    [
      'gasPrice-only request uses the full price',
      { fromRequest: true, marketPriorityFee: GWEI },
      10 * GWEI,
    ],
    [
      'cached custom price uses the cached tip',
      {
        fromRequest: false,
        cachedPriorityFee: 2 * GWEI,
        marketPriorityFee: GWEI,
      },
      2 * GWEI,
    ],
    [
      'cached custom price without a cached tip uses the market tip',
      { fromRequest: false, cachedPriorityFee: null, marketPriorityFee: GWEI },
      GWEI,
    ],
    [
      'tip above the price is capped',
      { fromRequest: true, requestPriorityFee: 20 * GWEI },
      10 * GWEI,
    ],
  ])('%s', (_name, args, expected) => {
    expect(resolveCustomGasPriorityFee({ price: 10 * GWEI, ...args })).toBe(
      expected
    );
  });
});

describe('getCustomNetworkEffectiveGasPrice', () => {
  test('charges baseFee + tip below the cap', () => {
    expect(
      getCustomNetworkEffectiveGasPrice(
        { price: 16 * GWEI, priority_price: GWEI, base_fee: 10 * GWEI },
        true
      )
    ).toBe(11 * GWEI);
  });

  test('never exceeds maxFee', () => {
    expect(
      getCustomNetworkEffectiveGasPrice(
        { price: 10 * GWEI, priority_price: GWEI, base_fee: 12 * GWEI },
        true
      )
    ).toBe(10 * GWEI);
  });

  test('uses the full price for legacy or unknown base fee', () => {
    const gas = { price: 16 * GWEI, priority_price: GWEI, base_fee: 10 * GWEI };
    expect(getCustomNetworkEffectiveGasPrice(gas, false)).toBe(16 * GWEI);
    expect(
      getCustomNetworkEffectiveGasPrice(
        { ...gas, base_fee: undefined } as any,
        true
      )
    ).toBe(16 * GWEI);
  });
});

describe('getCustomNetworkGasCost', () => {
  const gasUsed = 21000;
  // same max fee as the market normal level, different tip
  const market = {
    price: 16 * GWEI,
    priority_price: GWEI,
    base_fee: 10 * GWEI,
  };
  const requested = { ...market, priority_price: 5 * GWEI };

  test('prices the requested tip, not a market level with the same cap', () => {
    const cost = getCustomNetworkGasCost({
      gas: requested,
      gasUsed,
      support1559: true,
    });

    expect(cost.toString()).toBe(String((15 * GWEI * gasUsed) / 1e18));
    expect(
      getCustomNetworkGasCost({ gas: market, gasUsed, support1559: true }).eq(
        cost
      )
    ).toBe(false);
  });

  test('caps the estimate at the max fee', () => {
    const cost = getCustomNetworkGasCost({
      gas: { ...requested, price: 12 * GWEI },
      gasUsed,
      support1559: true,
    });

    expect(cost.toString()).toBe(String((12 * GWEI * gasUsed) / 1e18));
  });

  test('charges the full price on legacy networks', () => {
    const cost = getCustomNetworkGasCost({
      gas: requested,
      gasUsed,
      support1559: false,
    });

    expect(cost.toString()).toBe(String((16 * GWEI * gasUsed) / 1e18));
  });
});

describe('hasValidCustomNetworkGasFields', () => {
  test.each([
    [{ maxFeePerGas: '0x2', maxPriorityFeePerGas: '0x2' }, true, true],
    [{ maxFeePerGas: '0x2', maxPriorityFeePerGas: '0x3' }, true, false],
    [{ maxFeePerGas: '0x2' }, true, false],
    [{ maxFeePerGas: '0x', maxPriorityFeePerGas: '0x' }, true, false],
    [
      { maxFeePerGas: '0x2', maxPriorityFeePerGas: '0x1', gasPrice: '0x2' },
      true,
      false,
    ],
    [{ gasPrice: '0x0' }, false, true],
    [{ gasPrice: '' }, false, false],
    [{ gasPrice: '0x2', maxFeePerGas: '0x2' }, false, false],
  ])('%j with support1559=%s -> %s', (fields, support1559, expected) => {
    expect(hasValidCustomNetworkGasFields(fields, support1559)).toBe(expected);
  });
});
