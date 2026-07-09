import {
  applyAmountInputUrlStateToSearchParams,
  areAmountInputTokenAmountsEqual,
  buildAmountInputQueryFields,
  chooseRestoredUsdAmountInputState,
  createUsdAmountInputUrlState,
  getNextUsdPriceSnapshot,
  getUsdAmountInputDisplayState,
  normalizeUsdAmountInputUrlStateForTokenAmount,
  parseAmountInputUrlState,
  shouldDisplaySmallUsdMaxAmount,
} from '@/ui/views/SendToken/amountInputState';

describe('send amount input url state', () => {
  it('compares restored token amounts by numeric value', () => {
    expect(areAmountInputTokenAmountsEqual('1', '1.0')).toBe(true);
    expect(areAmountInputTokenAmountsEqual('0.1000', '0.1')).toBe(true);
    expect(areAmountInputTokenAmountsEqual('', '0')).toBe(false);
    expect(areAmountInputTokenAmountsEqual('1', '1.0001')).toBe(false);
    expect(areAmountInputTokenAmountsEqual('abc', 'abc')).toBe(true);
    expect(areAmountInputTokenAmountsEqual('abc', '1')).toBe(false);
  });

  it('serializes and parses USD input state', () => {
    const state = createUsdAmountInputUrlState({
      tokenKey: 'ETH:0xAbC',
      usdInputValue: '12.34',
      usdPrice: 3000,
      isUsdMaxAmountActive: true,
    });

    expect(state).toEqual({
      mode: 'usd',
      usdInputValue: '12.34',
      usdPrice: 3000,
      tokenKey: 'eth:0xabc',
      isUsdMaxAmountActive: true,
    });
    expect(
      parseAmountInputUrlState(buildAmountInputQueryFields(state))
    ).toEqual(state);
  });

  it('prefers non-empty cached USD input over empty URL USD state for the same token', () => {
    const paramState = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '',
      usdPrice: 3000,
    });
    const cachedState = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '99.99',
      usdPrice: 3000,
    });

    expect(chooseRestoredUsdAmountInputState({ paramState, cachedState })).toBe(
      cachedState
    );
  });

  it('keeps non-empty URL USD input ahead of cached state', () => {
    const paramState = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '12.34',
      usdPrice: 3000,
    });
    const cachedState = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '99.99',
      usdPrice: 3000,
    });

    expect(chooseRestoredUsdAmountInputState({ paramState, cachedState })).toBe(
      paramState
    );
  });

  it('rejects malformed USD state', () => {
    expect(
      createUsdAmountInputUrlState({
        tokenKey: 'eth:eth',
        usdInputValue: '1.234',
        usdPrice: 3000,
      })
    ).toBeNull();
    expect(
      parseAmountInputUrlState({
        amountInputMode: 'usd',
        usdInputValue: '1',
        usdPrice: '0',
        usdTokenKey: 'eth:eth',
      })
    ).toBeNull();
  });

  it('clears stale USD query fields for token mode', () => {
    const searchParams = new URLSearchParams({
      amount: '1',
      amountInputMode: 'usd',
      usdInputValue: '100',
      usdPrice: '3000',
      usdTokenKey: 'eth:eth',
      usdMax: '1',
    });

    applyAmountInputUrlStateToSearchParams(searchParams, null);

    expect(searchParams.get('amount')).toBe('1');
    expect(searchParams.get('amountInputMode')).toBeNull();
    expect(searchParams.get('usdInputValue')).toBeNull();
    expect(searchParams.get('usdPrice')).toBeNull();
    expect(searchParams.get('usdTokenKey')).toBeNull();
    expect(searchParams.get('usdMax')).toBeNull();
  });

  it('clears only USD query fields when sender account reset keeps send context', () => {
    const searchParams = new URLSearchParams({
      to: '0x0000000000000000000000000000000000000001',
      type: 'send-token',
      token: 'eth:eth',
      amount: '',
      rbisource: 'dashboard',
      amountInputMode: 'usd',
      usdInputValue: '100',
      usdPrice: '3000',
      usdTokenKey: 'eth:eth',
      usdMax: '1',
    });

    applyAmountInputUrlStateToSearchParams(searchParams, null);

    expect(searchParams.get('to')).toBe(
      '0x0000000000000000000000000000000000000001'
    );
    expect(searchParams.get('type')).toBe('send-token');
    expect(searchParams.get('token')).toBe('eth:eth');
    expect(searchParams.get('amount')).toBe('');
    expect(searchParams.get('rbisource')).toBe('dashboard');
    expect(searchParams.get('amountInputMode')).toBeNull();
    expect(searchParams.get('usdInputValue')).toBeNull();
    expect(searchParams.get('usdPrice')).toBeNull();
    expect(searchParams.get('usdTokenKey')).toBeNull();
    expect(searchParams.get('usdMax')).toBeNull();
  });

  it('updates token-mode price snapshot when the same token receives a valid price', () => {
    expect(
      getNextUsdPriceSnapshot({
        prev: {
          tokenKey: 'eth:eth',
          price: null,
        },
        tokenKey: 'eth:eth',
        tokenUsdPrice: 3000,
        amountInputMode: 'token',
        amountInputHasValue: true,
      })
    ).toEqual({
      tokenKey: 'eth:eth',
      price: 3000,
    });
  });

  it('keeps USD-mode price snapshot while the user has an amount input', () => {
    const prev = {
      tokenKey: 'eth:eth',
      price: 3000,
    };

    expect(
      getNextUsdPriceSnapshot({
        prev,
        tokenKey: 'eth:eth',
        tokenUsdPrice: 3100,
        amountInputMode: 'usd',
        amountInputHasValue: true,
      })
    ).toBe(prev);
  });

  it('updates USD-mode price snapshot while the input is empty', () => {
    expect(
      getNextUsdPriceSnapshot({
        prev: {
          tokenKey: 'eth:eth',
          price: 3000,
        },
        tokenKey: 'eth:eth',
        tokenUsdPrice: 3100,
        amountInputMode: 'usd',
        amountInputHasValue: false,
      })
    ).toEqual({
      tokenKey: 'eth:eth',
      price: 3100,
    });
  });

  it('detects small USD max display state from token amount and price', () => {
    expect(
      shouldDisplaySmallUsdMaxAmount({
        tokenAmount: '0.000003',
        usdPrice: 1000,
        isUsdMaxAmountActive: true,
      })
    ).toBe(true);

    expect(
      shouldDisplaySmallUsdMaxAmount({
        tokenAmount: '0.00001',
        usdPrice: 1000,
        isUsdMaxAmountActive: true,
      })
    ).toBe(false);

    expect(
      shouldDisplaySmallUsdMaxAmount({
        tokenAmount: '0.000003',
        usdPrice: 1000,
        isUsdMaxAmountActive: false,
      })
    ).toBe(false);
  });

  it('normalizes stale USD input for small max amount restores', () => {
    const state = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '0.00',
      usdPrice: 1000,
      isUsdMaxAmountActive: true,
    });

    expect(
      normalizeUsdAmountInputUrlStateForTokenAmount(state, '0.000003')
    ).toEqual({
      mode: 'usd',
      usdInputValue: '',
      usdPrice: 1000,
      tokenKey: 'eth:eth',
      isUsdMaxAmountActive: true,
    });
  });

  it('keeps USD input for non-small max amount restores', () => {
    const state = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '0.01',
      usdPrice: 1000,
      isUsdMaxAmountActive: true,
    });

    expect(
      normalizeUsdAmountInputUrlStateForTokenAmount(state, '0.00001')
    ).toEqual(state);
  });

  it('builds small USD max display state without exposing token amount', () => {
    const state = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '0.00',
      usdPrice: 1000,
      isUsdMaxAmountActive: true,
    });

    expect(
      getUsdAmountInputDisplayState({
        state,
        tokenAmount: '0.000003',
      })
    ).toEqual({
      state: {
        mode: 'usd',
        usdInputValue: '',
        usdPrice: 1000,
        tokenKey: 'eth:eth',
        isUsdMaxAmountActive: true,
      },
      usdInputValue: '',
      shouldShowSmallUsdMaxAmount: true,
    });
  });

  it('keeps normal USD display state for non-small max amount', () => {
    const state = createUsdAmountInputUrlState({
      tokenKey: 'eth:eth',
      usdInputValue: '0.01',
      usdPrice: 1000,
      isUsdMaxAmountActive: true,
    });

    expect(
      getUsdAmountInputDisplayState({
        state,
        tokenAmount: '0.00001',
      })
    ).toEqual({
      state,
      usdInputValue: '0.01',
      shouldShowSmallUsdMaxAmount: false,
    });
  });
});
