import 'reflect-metadata';
import * as Sentry from '@sentry/browser';
import providerController from '@/background/controller/provider/controller';
import type { ProviderRequest } from '@/background/controller/provider/type';

jest.mock('@sentry/browser', () => ({ captureMessage: jest.fn() }));
jest.mock('background/service', () => ({
  permissionService: { isInternalOrigin: () => true },
}));
jest.mock('consts', () => ({ KEYRING_TYPE: {}, EVENTS: {} }));
jest.mock('@/utils/chain', () => ({}));
jest.mock('@/utils', () => ({}));
jest.mock('@/utils/sentry', () => ({}));
jest.mock('@/utils/transaction', () => ({}));
jest.mock('@/utils/tempo', () => ({}));
jest.mock('@/background/controller/base', () => class {});
jest.mock('@/background/controller/wallet', () => ({}));
jest.mock('@/background/controller/utils', () => ({}));
jest.mock('@/background/service/customTestnet', () => ({}));
jest.mock('@/background/service/blockedAddress', () => ({}));
jest.mock('@/background/utils/rpcCache', () => ({}));
jest.mock('@/background/utils/buildinProvider', () => ({}));
jest.mock('@/background/utils/tx', () => ({}));
jest.mock('@/background/utils/gasAccountLogin', () => ({}));
jest.mock('@/background/controller/walletUtils/fix', () => ({}));

const captureMessage = Sentry.captureMessage as jest.Mock;
const from = '0x1111111111111111111111111111111111111111';
const base = {
  types: {
    EIP712Domain: [
      { name: 'version', type: 'string' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Mail: [
      { name: 'contents', type: 'string' },
      { name: 'approved', type: 'bool' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  primaryType: 'Mail',
  domain: { version: '1', verifyingContract: from },
  message: { contents: 'hi', approved: true, to: from, amount: '123' },
};

describe.each(['ethSignTypedDataV3', 'ethSignTypedDataV4'])(
  '%s type validation',
  (method) => {
    const [component, validate] = Reflect.getMetadata(
      'APPROVAL',
      providerController,
      method
    ) as [string, (req: ProviderRequest) => void];
    const request = (data: unknown) =>
      ({
        data: { params: [from, JSON.stringify(data)] },
        session: { origin: 'https://example.test' },
        account: { address: from },
      } as ProviderRequest);

    beforeEach(() => captureMessage.mockReset());

    it.each([
      ['string false', { message: { ...base.message, approved: 'false' } }],
      ['string true', { message: { ...base.message, approved: 'true' } }],
      ['numeric string', { message: { ...base.message, contents: 123 } }],
      [
        'unprefixed address',
        { message: { ...base.message, to: 'c'.repeat(40) } },
      ],
      ['numeric address', { message: { ...base.message, to: 123 } }],
      ['numeric domain version', { domain: { ...base.domain, version: 49 } }],
      [
        'invalid domain address',
        { domain: { ...base.domain, verifyingContract: 'c'.repeat(40) } },
      ],
      [
        'nested struct',
        {
          types: { ...base.types, Outer: [{ name: 'mail', type: 'Mail' }] },
          primaryType: 'Outer',
          message: { mail: { ...base.message, approved: 'false' } },
        },
      ],
      [
        'array item',
        {
          types: { ...base.types, Flags: [{ name: 'flags', type: 'bool[]' }] },
          primaryType: 'Flags',
          message: { flags: [false, 'false'] },
        },
      ],
    ])('rejects %s and preserves Sentry reporting', (_name, overrides) => {
      const req = request({ ...base, ...overrides });
      expect(component).toBe('SignTypedData');
      expect(() => validate(req)).toThrow(
        expect.objectContaining({
          code: -32602,
          message: 'invalid typed data',
        })
      );
      expect(captureMessage).toHaveBeenCalledTimes(1);
      expect(captureMessage).toHaveBeenCalledWith(
        'eip712-sec: typed data value type mismatch',
        {
          extra: { rawTypedData: req.data.params[1] },
        }
      );
    });

    it.each([
      base.message,
      { ...base.message, approved: false, contents: '' },
      { ...base.message, to: '0x1' },
      { ...base.message, to: `0X${'A'.repeat(40)}` },
    ])('accepts valid values %p without reporting', (message) => {
      expect(() => validate(request({ ...base, message }))).not.toThrow();
      expect(captureMessage).not.toHaveBeenCalled();
    });

    it('still rejects when Sentry throws', () => {
      captureMessage.mockImplementationOnce(() => {
        throw new Error('sentry down');
      });
      expect(() =>
        validate(
          request({
            ...base,
            message: { ...base.message, approved: 'false' },
          })
        )
      ).toThrow(expect.objectContaining({ code: -32602 }));
      expect(captureMessage).toHaveBeenCalledTimes(1);
    });
  }
);
