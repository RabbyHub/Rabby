import 'reflect-metadata';
import SimpleKeyring from '@rabby-wallet/eth-simple-keyring';
import { Transaction } from 'viem/tempo';
import {
  ApprovalRes,
  buildSignTx,
  normalizeTxParams,
} from '@/utils/transaction';
import { buildTempoTransaction, TempoTxCall } from '@/utils/tempo';
import providerController from '@/background/controller/provider/controller';
import { keyringService } from 'background/service';

const from = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf';
const to = '0x20c0000000000000000000000000000000000000';
const data = `0xa9059cbb${'dead'.padStart(64, '0')}${'2710'.padStart(64, '0')}`;
const keyring = new SimpleKeyring(['1'.padStart(64, '0')]);
const stopAfterSigning = new Error('stop before broadcast');
let serializedTransaction: `0x76${string}` | `0x78${string}`;

jest.mock('background/service', () => ({
  keyringService: {
    getKeyringForAccount: jest.fn(async () => keyring),
    signTransaction: jest.fn(async (_keyring, tx, address) => {
      ({ serializedTransaction } = await keyring.signTransaction(address, tx));
      throw stopAfterSigning;
    }),
  },
  transactionHistoryService: {
    getSigningTx: () => ({ rawTx: {} }),
  },
  RPCService: { probeBestRPC: jest.fn() },
}));
jest.mock('consts', () => ({
  KEYRING_TYPE: { SimpleKeyring: 'Simple Key Pair', HdKeyring: 'HD Key Tree' },
  KEYRING_CATEGORY_MAP: {},
  EVENTS: { COMMON_HARDWARE: { REJECTED: 'REJECTED' } },
}));
jest.mock('@/utils/chain', () => {
  const chain = { id: 4217, serverId: 'tempo', enum: 'TEMPO' };
  return { findChain: () => chain, findChainByEnum: () => chain };
});
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/utils', () => ({}));
jest.mock('@/utils/matomo-request', () => ({}));
jest.mock('@/utils/sentry', () => ({
  takeSigningCarrier: () => undefined,
  getSigningContext: () => undefined,
}));
jest.mock('@/stats', () => ({}));
jest.mock('@/background/controller/base', () => class {});
jest.mock('@/background/controller/wallet', () => ({}));
jest.mock('@/background/controller/utils', () => ({}));
jest.mock('@/background/service/customTestnet', () => ({}));
jest.mock('@/background/utils/rpcCache', () => ({}));
jest.mock('@/background/utils/buildinProvider', () => ({}));
jest.mock('@/background/utils/tx', () => ({}));
jest.mock('@/background/utils/gasAccountLogin', () => ({}));
jest.mock('@/background/controller/walletUtils/fix', () => ({}));

const request = (overrides: Record<string, any> = {}) => ({
  from,
  chainId: '0x1079',
  type: '0x76',
  to,
  data,
  value: '0x1',
  gas: '0x493e0',
  maxFeePerGas: '0x2',
  maxPriorityFeePerGas: '0x1',
  nonce: '0x0',
  ...overrides,
});

const approve = (
  tx: ReturnType<typeof request>,
  isGasAccount: boolean
): ApprovalRes & { calls?: TempoTxCall[] } => {
  const displayed = buildSignTx({
    tx: normalizeTxParams(tx as any, true) as any,
    chainId: 4217,
  });
  return {
    ...buildTempoTransaction(displayed, { feePayer: isGasAccount }),
    isGasAccount,
  };
};

const submit = (txParams: any, approvalRes: any) =>
  providerController.ethSendTransaction({
    data: { params: [txParams] },
    session: { origin: 'https://example.test', name: '', icon: '' },
    approvalRes,
    account: { address: from, type: 'Simple Key Pair', brandName: '' },
    pushed: false,
    result: undefined,
  });

const sign = async (txParams: any, approvalRes: any) => {
  await expect(submit(txParams, approvalRes)).rejects.toMatchObject({
    message: stopAfterSigning.message,
  });
  const signed = Transaction.deserialize(serializedTransaction);
  // The decoder omits empty calldata and zero value.
  return {
    ...signed,
    calls: signed.calls.map((call) => ({
      to: call.to,
      data: call.data ?? '0x',
      value: call.value ?? 0n,
    })),
  };
};

describe.each([false, true])(
  'Tempo signing (gas account: %s)',
  (isGasAccount) => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    test.each([
      ['empty recipient', { calls: [{ to: '', data, value: '0x0' }] }],
      ['missing call fields', { calls: [{}] }],
      ['top-level call', {}],
      ['empty calldata', { calls: [{ to, data: '', value: '0x0' }] }],
      ['contract creation', { to: undefined, calls: [{ data: '0x6000' }] }],
      [
        'mixed batch',
        {
          calls: [
            { to: '', data: '0x6000' },
            { to, data, value: '0x0' },
          ],
        },
      ],
    ])('signs the approved calls for %s', async (_name, overrides) => {
      const txParams = request(overrides as Record<string, any>);
      const approvalRes = approve(txParams, isGasAccount);
      const signed = await sign(txParams, approvalRes);

      expect(serializedTransaction.slice(0, 4)).toBe(
        isGasAccount ? '0x78' : '0x76'
      );
      expect(signed.calls).toEqual(
        approvalRes.calls!.map((call) => ({
          to: call.to,
          data: call.data || '0x',
          value: BigInt(call.value || 0),
        }))
      );
    });

    test('does not restore fields removed from the approval', async () => {
      const txParams = request({ calls: [{ to, data, value: '0x1' }] });
      const approvalRes = approve(txParams, isGasAccount);
      approvalRes.calls = [{ data: '0x6000', value: '0x0' }, {}];
      const signed = await sign(txParams, approvalRes);

      expect(signed.calls).toEqual([
        { to: undefined, data: '0x6000', value: 0n },
        { to: undefined, data: '0x', value: 0n },
      ]);
    });

    test('supports an approved top-level call without calls', async () => {
      const txParams = request();
      const approvalRes = { ...txParams, isGasAccount, data: '0x6000' };
      const signed = await sign(txParams, approvalRes);
      expect(signed.calls).toEqual([{ to, data: '0x6000', value: 1n }]);
    });

    test.each([undefined, null, ''])(
      'rejects missing approved calls with empty top-level fields (%s)',
      async (empty) => {
        const txParams = request({ calls: [{ to, data, value: '0x1' }] });
        for (const calls of [undefined, null, []]) {
          const approvalRes = {
            ...approve(txParams, isGasAccount),
            calls,
            to: empty,
            data: empty,
            value: empty,
          };
          await expect(submit(txParams, approvalRes)).rejects.toThrow(
            'tempo transaction has no approved calls'
          );
          expect(keyringService.signTransaction).not.toHaveBeenCalled();
        }
      }
    );

    test.each([
      ['deployment', { data: '0x6000' }],
      ['empty calldata', { data: '0x' }],
      ['zero value', { value: '0x0' }],
    ])('preserves an explicitly approved top-level %s', async (_name, call) => {
      const txParams = request({ calls: [{ to, data, value: '0x1' }] });
      const approvalRes = {
        ...approve(txParams, isGasAccount),
        calls: [],
        ...call,
      };
      const signed = await sign(txParams, approvalRes);
      expect(signed.calls).toEqual([
        {
          to: undefined,
          data: approvalRes.data || '0x',
          value: BigInt(approvalRes.value || 0),
        },
      ]);
    });
  }
);
