/**
 * @jest-environment node
 */
// abi-utils and eth-sig-util reject jsdom's Uint8Array as a foreign realm.
jest.mock('@sentry/browser', () => ({ captureMessage: jest.fn() }));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/ui/views/Approval/components/Actions/utils', () => ({}));

import * as Sentry from '@sentry/browser';
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';
import {
  getNormalizeTypeDataVersion,
  normalizeTypeData,
  reportNormalizeTypeDataFailures,
} from '@/ui/views/Approval/components/TypedDataActions/utils';

const { V3, V4 } = SignTypedDataVersion;
const captureMessage = Sentry.captureMessage as jest.Mock;

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];
const CONTRACT = '0x0000000000000000000000000000000000abcdef';

const payload = (
  fields: { name: string; type: string }[],
  message: Record<string, any>,
  extraTypes: Record<string, { name: string; type: string }[]> = {}
) => ({
  types: { EIP712Domain, Mail: fields, ...extraTypes },
  primaryType: 'Mail',
  domain: { name: 'Mail', chainId: '0x01', verifyingContract: '0xabcdef' },
  message,
});
const hash = (data: any, version: typeof V3 | typeof V4 = V4) =>
  TypedDataUtils.eip712Hash(data, version).toString('hex');
const normalizedDomain = {
  name: 'Mail',
  chainId: '1',
  verifyingContract: CONTRACT,
};

describe('normalizeTypeData', () => {
  it('normalizes the domain and message values', () => {
    const data = payload(
      [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'ok', type: 'bool' },
      ],
      { to: '0x1234', amount: '0x64', ok: true }
    );
    const { typedData, failures } = normalizeTypeData(data, V4);
    expect(failures).toEqual([]);
    expect(typedData.domain).toEqual(normalizedDomain);
    expect(typedData.message).toEqual({
      to: '0x0000000000000000000000000000000000001234',
      amount: '100',
      ok: true,
    });
    expect(hash(typedData)).toBe(hash(data));
  });

  it.each([
    ['uint256[2]', ['0x1', '0x02'], ['1', '2']],
    [
      'uint256[2][]',
      [
        ['1', '0x2'],
        ['3', '4'],
      ],
      [
        ['1', '2'],
        ['3', '4'],
      ],
    ],
    ['uint256[][2]', [['0x1'], []], [['1'], []]],
  ])('normalizes %s', (type, values, expected) => {
    const data = payload([{ name: 'values', type }], { values });
    const { typedData, failures } = normalizeTypeData(data, V4);
    expect(failures).toEqual([]);
    expect(typedData.domain).toEqual(normalizedDomain);
    expect(typedData.message.values).toEqual(expected);
    expect(hash(typedData)).toBe(hash(data));
  });

  it('normalizes the elements of a struct array', () => {
    const data = payload(
      [{ name: 'people', type: 'Person[2]' }],
      { people: [{ wallet: '0x1' }, { wallet: '0x2' }] },
      { Person: [{ name: 'wallet', type: 'address' }] }
    );
    const { typedData, failures } = normalizeTypeData(data, V4);
    expect(failures).toEqual([]);
    expect(typedData.message.people[1].wallet).toBe(
      '0x0000000000000000000000000000000000000002'
    );
  });

  it('keeps a null struct, which V4 hashes as zero', () => {
    const data = payload(
      [
        { name: 'amount', type: 'uint256' },
        { name: 'note', type: 'Note' },
      ],
      { amount: '0x10', note: null },
      { Note: [{ name: 'value', type: 'uint256' }] }
    );
    const { typedData, failures } = normalizeTypeData(data, V4);
    expect(failures).toEqual([]);
    expect(typedData.domain).toEqual(normalizedDomain);
    expect(typedData.message).toEqual({ amount: '16', note: null });
    expect(hash(typedData)).toBe(hash(data));
  });

  it('keeps a value that cannot be normalized and normalizes the rest', () => {
    const data = payload(
      [
        { name: 'amount', type: 'uint256' },
        { name: 'to', type: 'address' },
      ],
      { amount: 'not a number', to: '0x1' }
    );
    const { typedData, failures } = normalizeTypeData(data, V4);
    expect(failures).toEqual([
      expect.objectContaining({
        reason: 'field',
        path: 'message.amount',
        type: 'uint256',
      }),
    ]);
    expect(typedData.domain).toEqual(normalizedDomain);
    expect(typedData.message).toEqual({
      amount: 'not a number',
      to: '0x0000000000000000000000000000000000000001',
    });
  });

  it('skips a missing field in V3 and reports it in V4', () => {
    const data = payload(
      [
        { name: 'amount', type: 'uint256' },
        { name: 'to', type: 'address' },
      ],
      { amount: '1' }
    );
    const v3 = normalizeTypeData(data, V3);
    expect(v3.failures).toEqual([]);
    expect(v3.typedData.message).toEqual({ amount: '1' });
    expect(hash(v3.typedData, V3)).toBe(hash(data, V3));

    expect(normalizeTypeData(data, V4).failures).toEqual([
      expect.objectContaining({ reason: 'field', path: 'message.to' }),
    ]);
  });

  it('drops undeclared fields at every level', () => {
    const data = payload(
      [{ name: 'from', type: 'Person' }],
      { from: { wallet: '0x1', extra: 'x' }, extra: 'y' },
      { Person: [{ name: 'wallet', type: 'address' }] }
    );
    const { typedData } = normalizeTypeData(data, V4);
    expect(typedData.message).toEqual({
      from: { wallet: '0x0000000000000000000000000000000000000001' },
    });
  });

  it('normalizes a domain without an EIP712Domain type to empty', () => {
    const data = payload([{ name: 'amount', type: 'uint256' }], {
      amount: '1',
    });
    delete (data.types as any).EIP712Domain;
    const { typedData, failures } = normalizeTypeData(data, V4);
    expect(failures).toEqual([]);
    expect(typedData.domain).toEqual({});
    expect(hash(typedData)).toBe(hash(data));
  });

  it('does not modify its input', () => {
    const data = payload([{ name: 'values', type: 'uint256[]' }], {
      values: ['0x1'],
    });
    const copy = JSON.parse(JSON.stringify(data));
    normalizeTypeData(data, V4);
    expect(data).toEqual(copy);
  });
});

describe('getNormalizeTypeDataVersion', () => {
  it.each([
    ['eth_signTypedData_v3', V3],
    ['eth_signTypedData_v4', V4],
    ['ethSignTypedDataV3', V3],
    ['ethSignTypedDataV4', V4],
  ])('reads %s as %s', (method, version) => {
    expect(getNormalizeTypeDataVersion(method)).toBe(version);
  });
});

describe('reportNormalizeTypeDataFailures', () => {
  const context = {
    rawTypedData: JSON.stringify({
      message: { contents: 'x'.repeat(1000) },
    }),
  };

  beforeEach(() => captureMessage.mockClear());

  it('does not report without failures', () => {
    reportNormalizeTypeDataFailures([], context);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('reports only the original typed data', () => {
    reportNormalizeTypeDataFailures(
      [
        {
          reason: 'field',
          path: 'message.amount',
          type: 'uint256',
          error: new TypeError('bad value'),
        },
        { reason: 'digest', path: '', type: 'Mail' },
      ],
      context
    );
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      'eip712-sec: typed data normalize failed',
      {
        extra: {
          rawTypedData: context.rawTypedData,
        },
      }
    );
  });

  it('does not throw when reporting fails', () => {
    captureMessage.mockImplementationOnce(() => {
      throw new Error('sentry down');
    });
    expect(() =>
      reportNormalizeTypeDataFailures(
        [{ reason: 'digest', path: '', type: 'Mail' }],
        context
      )
    ).not.toThrow();
  });
});
