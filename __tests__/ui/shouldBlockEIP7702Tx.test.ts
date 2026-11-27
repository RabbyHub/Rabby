import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { shouldBlockEIP7702Tx } from '@/ui/views/Approval/components/shouldBlockEIP7702Tx';

jest.mock('@/i18n', () => ({ t: (key: string) => key }));

const DAPP_ORIGIN = 'https://dapp.example';
const authorizationList = [
  { address: '0x0000000000000000000000000000000000000001' },
];

describe('shouldBlockEIP7702Tx', () => {
  it('blocks any EIP-7702 tx from outside Rabby, including speed-ups', () => {
    expect(
      shouldBlockEIP7702Tx({ tx: { authorizationList }, origin: DAPP_ORIGIN })
    ).toBe(true);
    expect(
      shouldBlockEIP7702Tx({
        tx: { authorizationList, isSpeedUp: true },
        origin: DAPP_ORIGIN,
      })
    ).toBe(true);
  });

  it('blocks a 7702 revoke flag from outside Rabby even without an authorization list', () => {
    expect(
      shouldBlockEIP7702Tx({
        tx: {},
        origin: DAPP_ORIGIN,
        isEIP7702Revoke: true,
      })
    ).toBe(true);
  });

  it('blocks an internal EIP-7702 tx unless it is a speed-up or a revoke', () => {
    expect(
      shouldBlockEIP7702Tx({
        tx: { authorizationList },
        origin: INTERNAL_REQUEST_ORIGIN,
      })
    ).toBe(true);
    expect(
      shouldBlockEIP7702Tx({
        tx: { authorizationList, isSpeedUp: true },
        origin: INTERNAL_REQUEST_ORIGIN,
      })
    ).toBe(false);
    expect(
      shouldBlockEIP7702Tx({
        tx: { authorizationList },
        origin: INTERNAL_REQUEST_ORIGIN,
        isEIP7702Revoke: true,
      })
    ).toBe(false);
  });

  it('lets ordinary transactions through', () => {
    expect(shouldBlockEIP7702Tx({ tx: {}, origin: DAPP_ORIGIN })).toBe(false);
    expect(
      shouldBlockEIP7702Tx({
        tx: { authorizationList: [] },
        origin: DAPP_ORIGIN,
      })
    ).toBe(false);
    expect(
      shouldBlockEIP7702Tx({ tx: {}, origin: INTERNAL_REQUEST_ORIGIN })
    ).toBe(false);
  });
});
