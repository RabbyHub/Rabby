import { act, renderHook } from '@testing-library/react';

const spotOrder = jest.fn();
const cancelSpotOrders = jest.fn();
const handleActionApproveStatus = jest.fn();
const judgeIsUserAgentIsExpired = jest.fn();
const setAccountNeedApproveBuilderFee = jest.fn();
const messageSuccess = jest.fn();
const messageError = jest.fn();
const capturePerpsError = jest.fn();

const ACCOUNT = {
  address: '0xAbC0000000000000000000000000000000000001',
  type: 'Private Key',
};
let perpsState: {
  currentPerpsAccount: typeof ACCOUNT | null;
  hasPermission: boolean;
};

jest.mock('@/ui/views/Perps/sdkManager', () => ({
  getPerpsSDK: () => ({ exchange: { spotOrder, cancelSpotOrders } }),
}));
jest.mock('@/ui/views/Perps/hooks/usePerpsState', () => ({
  usePerpsState: () => ({
    handleActionApproveStatus,
    judgeIsUserAgentIsExpired,
  }),
}));
jest.mock('@/ui/state/perps', () => ({
  usePerpsStore: { getState: () => perpsState },
}));
jest.mock('@/ui/store', () => ({
  useRabbyDispatch: () => ({ perps: { setAccountNeedApproveBuilderFee } }),
}));
jest.mock('@/ui/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));
jest.mock('@/ui/views/Perps/sentry', () => ({ capturePerpsError }));
jest.mock('@/ui/views/Perps/utils', () => ({
  isBuilderFeeNotApprovedError: (msg?: string) =>
    !!msg?.includes('Builder fee'),
}));
jest.mock('antd', () => ({
  message: { success: messageSuccess, error: messageError },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useSpotActions } from '@/ui/views/PerpsSpot/hooks/useSpotActions';

const orderResponse = (status: unknown) => ({
  status: 'ok',
  response: { type: 'order', data: { statuses: [status] } },
});

const params = (overrides = {}) => ({
  pairIndex: 142,
  side: 'buy' as const,
  type: 'market' as const,
  size: '0.0012',
  limitPx: '86930',
  ...overrides,
});

afterEach(() => {
  jest.restoreAllMocks();
});

const setup = () => renderHook(() => useSpotActions()).result.current;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  perpsState = { currentPerpsAccount: { ...ACCOUNT }, hasPermission: true };
  handleActionApproveStatus.mockResolvedValue(undefined);
  judgeIsUserAgentIsExpired.mockResolvedValue(false);
});

describe('useSpotActions.executeSpotOrder', () => {
  it('signs a market order as IOC after the approval and reports the fill', async () => {
    const calls: string[] = [];
    handleActionApproveStatus.mockImplementation(async () =>
      calls.push('approve')
    );
    spotOrder.mockImplementation(async () => {
      calls.push('sign');
      return orderResponse({
        filled: { totalSz: '0.0012', avgPx: '82800', oid: 7 },
      });
    });
    const buildParams = jest.fn(() => {
      calls.push('build');
      return params();
    });

    const { executeSpotOrder } = setup();
    let result: unknown;
    await act(async () => {
      result = await executeSpotOrder(142, buildParams);
    });

    expect(calls).toEqual(['approve', 'build', 'sign']);
    expect(spotOrder).toHaveBeenCalledWith({
      pairIndex: 142,
      isBuy: true,
      size: '0.0012',
      limitPx: '86930',
      tif: 'Ioc',
    });
    expect(result).toEqual({
      status: 'filled',
      totalSz: '0.0012',
      avgPx: '82800',
      oid: 7,
    });
    expect(messageSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'page.perpsSpot.toast.orderFilled' })
    );
  });

  it('sends limit orders as GTC and reports a resting order', async () => {
    spotOrder.mockResolvedValue(orderResponse({ resting: { oid: 9 } }));
    const { executeSpotOrder } = setup();
    let result: unknown;
    await act(async () => {
      result = await executeSpotOrder(142, () =>
        params({ side: 'sell', type: 'limit', limitPx: '90000' })
      );
    });
    expect(spotOrder).toHaveBeenCalledWith(
      expect.objectContaining({ isBuy: false, tif: 'Gtc', limitPx: '90000' })
    );
    expect(result).toEqual({ status: 'resting', oid: 9 });
  });

  it('does not sign when the order cannot be rebuilt after approval', async () => {
    const { executeSpotOrder } = setup();
    let result: unknown;
    await act(async () => {
      result = await executeSpotOrder(142, () => null);
    });
    expect(spotOrder).not.toHaveBeenCalled();
    expect(result).toBeNull();
    expect(messageError).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'page.perpsSpot.error.contextChanged',
      })
    );
  });

  it('stops silently when the approval step fails (it shows its own toast)', async () => {
    handleActionApproveStatus.mockRejectedValue(new Error('User rejected'));
    const buildParams = jest.fn(() => params());
    const { executeSpotOrder } = setup();
    let result: unknown;
    await act(async () => {
      result = await executeSpotOrder(142, buildParams);
    });
    expect(buildParams).not.toHaveBeenCalled();
    expect(spotOrder).not.toHaveBeenCalled();
    expect(messageError).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('refuses to sign when the Perps account changed during approval', async () => {
    handleActionApproveStatus.mockImplementation(async () => {
      perpsState.currentPerpsAccount = {
        ...ACCOUNT,
        address: '0x0000000000000000000000000000000000000002',
      };
    });
    const { executeSpotOrder } = setup();
    await act(async () => {
      await executeSpotOrder(142, () => params());
    });
    expect(spotOrder).not.toHaveBeenCalled();
    expect(messageError).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Perps account changed' })
    );
  });

  it('accepts the same account with a different address casing', async () => {
    handleActionApproveStatus.mockImplementation(async () => {
      perpsState.currentPerpsAccount = {
        ...ACCOUNT,
        address: ACCOUNT.address.toLowerCase(),
      };
    });
    spotOrder.mockResolvedValue(orderResponse({ resting: { oid: 1 } }));
    const { executeSpotOrder } = setup();
    await act(async () => {
      await executeSpotOrder(142, () => params());
    });
    expect(spotOrder).toHaveBeenCalledTimes(1);
  });

  it('refuses to sign outside supported regions, before and after approval', async () => {
    perpsState.hasPermission = false;
    let { executeSpotOrder } = setup();
    await act(async () => {
      await executeSpotOrder(142, () => params());
    });
    expect(handleActionApproveStatus).not.toHaveBeenCalled();
    expect(spotOrder).not.toHaveBeenCalled();

    perpsState.hasPermission = true;
    handleActionApproveStatus.mockImplementation(async () => {
      perpsState.hasPermission = false;
    });
    ({ executeSpotOrder } = setup());
    await act(async () => {
      await executeSpotOrder(142, () => params());
    });
    expect(spotOrder).not.toHaveBeenCalled();
    expect(messageError).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: 'page.perps.permissionTips' })
    );
  });

  it('refuses to sign without a Perps account', async () => {
    perpsState.currentPerpsAccount = null;
    const { executeSpotOrder } = setup();
    await act(async () => {
      await executeSpotOrder(142, () => params());
    });
    expect(handleActionApproveStatus).not.toHaveBeenCalled();
    expect(spotOrder).not.toHaveBeenCalled();
  });

  it('surfaces an exchange rejection and reports it to Sentry', async () => {
    spotOrder.mockResolvedValue(
      orderResponse({ error: 'Insufficient spot balance asset=10142' })
    );
    const { executeSpotOrder } = setup();
    let result: unknown;
    await act(async () => {
      result = await executeSpotOrder(142, () => params());
    });
    expect(result).toBeNull();
    expect(messageError).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Insufficient spot balance asset=10142',
      })
    );
    expect(capturePerpsError).toHaveBeenCalledWith(
      'spot trade error',
      expect.any(Error),
      { pairIndex: 142 }
    );
  });

  it('hands an expired agent to the existing re-approval flow without a toast', async () => {
    spotOrder.mockRejectedValue(
      new Error('User or API Wallet 0xagent does not exist.')
    );
    judgeIsUserAgentIsExpired.mockResolvedValue(true);
    const { executeSpotOrder } = setup();
    await act(async () => {
      await executeSpotOrder(142, () => params());
    });
    expect(judgeIsUserAgentIsExpired).toHaveBeenCalledWith(
      'User or API Wallet 0xagent does not exist.'
    );
    expect(messageError).not.toHaveBeenCalled();
    expect(capturePerpsError).not.toHaveBeenCalled();
  });

  it('flags the builder fee for re-approval when the exchange asks for it', async () => {
    spotOrder.mockRejectedValue(
      new Error('Builder fee has not been approved.')
    );
    const { executeSpotOrder } = setup();
    await act(async () => {
      await executeSpotOrder(142, () => params());
    });
    expect(setAccountNeedApproveBuilderFee).toHaveBeenCalledWith(true);
    expect(messageError).not.toHaveBeenCalled();
  });
});

describe('useSpotActions cancel', () => {
  const cancelResponse = (statuses: unknown[]) => ({
    status: 'ok',
    response: { type: 'cancel', data: { statuses } },
  });

  it('accepts the bare "success" string the API returns', async () => {
    cancelSpotOrders.mockResolvedValue(cancelResponse(['success']));
    const { cancelSpotOrder } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await cancelSpotOrder({ pairIndex: 142, oid: 5 });
    });
    expect(cancelSpotOrders).toHaveBeenCalledWith([{ pairIndex: 142, oid: 5 }]);
    expect(ok).toBe(true);
  });

  it('reports a failed cancel', async () => {
    cancelSpotOrders.mockResolvedValue(
      cancelResponse([
        { error: 'Order was never placed, already canceled, or filled.' },
      ])
    );
    const { cancelSpotOrder } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await cancelSpotOrder({ pairIndex: 142, oid: 5 });
    });
    expect(ok).toBe(false);
    expect(messageError).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Order was never placed, already canceled, or filled.',
      })
    );
  });

  it('rejects a malformed cancel before approval or signing', async () => {
    const { cancelSpotOrder } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await cancelSpotOrder({ pairIndex: -1, oid: 5 });
    });
    expect(ok).toBe(false);
    expect(handleActionApproveStatus).not.toHaveBeenCalled();
    expect(cancelSpotOrders).not.toHaveBeenCalled();
  });

  it('cancels all orders in one signed action, deduplicated', async () => {
    cancelSpotOrders.mockResolvedValue(cancelResponse(['success', 'success']));
    const { cancelAllSpotOrders } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await cancelAllSpotOrders([
        { pairIndex: 142, oid: 5 },
        { pairIndex: 107, oid: 6 },
        { pairIndex: 142, oid: 5 },
      ]);
    });
    expect(cancelSpotOrders).toHaveBeenCalledTimes(1);
    expect(cancelSpotOrders).toHaveBeenCalledWith([
      { pairIndex: 142, oid: 5 },
      { pairIndex: 107, oid: 6 },
    ]);
    expect(ok).toBe(true);
  });

  it('treats a partial cancel-all as a failure', async () => {
    cancelSpotOrders.mockResolvedValue(
      cancelResponse(['success', { error: 'Order was never placed' }])
    );
    const { cancelAllSpotOrders } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await cancelAllSpotOrders([
        { pairIndex: 142, oid: 5 },
        { pairIndex: 107, oid: 6 },
      ]);
    });
    expect(ok).toBe(false);
    expect(messageError).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Order was never placed' })
    );
  });

  it('does nothing for an empty cancel-all', async () => {
    const { cancelAllSpotOrders } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await cancelAllSpotOrders([]);
    });
    expect(ok).toBe(true);
    expect(handleActionApproveStatus).not.toHaveBeenCalled();
    expect(cancelSpotOrders).not.toHaveBeenCalled();
  });
});
