import { ethers } from 'ethers';
import Safe from '@rabby-wallet/gnosis-sdk';
import { EthSafeTransaction } from '@safe-global/protocol-kit';
import GnosisKeyring from '@/background/service/keyring/eth-gnosis-keyring';
import { normalizeSafeOperation } from '@/utils/gnosis';

jest.mock('@rabby-wallet/gnosis-sdk', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const SAFE_A = '0x1111111111111111111111111111111111111111';
const SAFE_B = '0x2222222222222222222222222222222222222222';
const OWNER = '0x3333333333333333333333333333333333333333';
const COOWNER = '0x4444444444444444444444444444444444444444';
const ZERO = ethers.constants.AddressZero;
const SIGNATURE = `0x${'ab'.repeat(64)}1b`;
const transactionA = {
  to: OWNER,
  value: '1234567890123456789',
  data: '0xabcd',
  operation: 1 as const,
  safeTxGas: '100000',
  baseGas: '123',
  gasPrice: '456',
  gasToken: COOWNER,
  refundReceiver: OWNER,
  nonce: 0,
};
const transactionB = { ...transactionA, to: COOWNER, value: '999' };

const hash = (safeAddress: string, network: string, data: unknown) =>
  ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(JSON.stringify({ safeAddress, network, data }))
  );

const createSafe = (
  safeAddress: string,
  version: string,
  _provider,
  network: string
) => ({
  safeAddress,
  version,
  network,
  buildTransaction: jest.fn(
    async (tx) =>
      new EthSafeTransaction({
        to: tx.to,
        value: tx.value || '0',
        data: tx.data || '0x',
        operation: tx.operation,
        safeTxGas: tx.safeTxGas || '0',
        baseGas: tx.baseGas || '0',
        gasPrice: tx.gasPrice || '0',
        gasToken: tx.gasToken || ZERO,
        refundReceiver: tx.refundReceiver || ZERO,
        nonce: tx.nonce ?? 10,
      })
  ),
  getTransactionHash: jest.fn(async (transaction) =>
    hash(safeAddress, network, transaction.data)
  ),
  postTransaction: jest.fn(async () => undefined),
  request: { confirmTransaction: jest.fn(async () => undefined) },
});

describe('Safe transaction approval snapshots', () => {
  let keyring: GnosisKeyring;
  let safeInstances: ReturnType<typeof createSafe>[];

  beforeEach(() => {
    safeInstances = [];
    (Safe as unknown as jest.Mock).mockImplementation(
      (...args: Parameters<typeof createSafe>) => {
        const safe = createSafe(...args);
        safeInstances.push(safe);
        return safe;
      }
    );
    keyring = new GnosisKeyring({
      accounts: [SAFE_A, SAFE_B],
      networkIdsMap: { [SAFE_A]: ['1'], [SAFE_B]: ['10'] },
    });
  });

  const prepare = (
    overrides: Partial<
      Parameters<GnosisKeyring['prepareTransactionForApproval']>[0]
    > = {}
  ) =>
    keyring.prepareTransactionForApproval({
      approvalId: 'approval-A',
      address: SAFE_A,
      transaction: transactionA,
      provider: {},
      version: '1.3.0',
      networkId: '1',
      assertCurrentApproval: jest.fn(),
      ...overrides,
    });

  test.each([undefined, 0, 1, '0', '1', '0x0', '0x1'])(
    'uses the same operation %s in simulation and signed typed data',
    async (operation) => {
      const prepared = await prepare({
        transaction: { ...transactionA, operation: operation as any },
      });
      const simulatedDelegateCall = normalizeSafeOperation(operation) === 1;
      expect(Number(prepared.typedData.message.operation) === 1).toBe(
        simulatedDelegateCall
      );
      expect(safeInstances[0].buildTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ operation: simulatedDelegateCall ? 1 : 0 })
      );
    }
  );

  test.each([null, true, false, 2, -1, '', 'false', '0x2', {}, []])(
    'rejects invalid operation %j before building a transaction',
    async (operation) => {
      await expect(
        prepare({
          transaction: { ...transactionA, operation: operation as any },
        })
      ).rejects.toThrow('Invalid Safe');
      expect(safeInstances).toHaveLength(0);
    }
  );

  test('preserves all reviewed Safe fields, including zero nonce and refund parameters', async () => {
    const expectedHash = hash(SAFE_A, '1', transactionA);
    const prepared = await prepare({ expectedHash });
    expect(prepared.transactionHash).toBe(expectedHash);
    expect(prepared.typedData.message).toEqual(transactionA);
    expect(prepared.typedData.domain).toEqual({
      verifyingContract: SAFE_A,
      chainId: '1',
    });
  });

  test.each([SAFE_A, SAFE_B])(
    'viewing/building proposal B for %s cannot replace A at signing or confirmation',
    async (otherSafe) => {
      const prepared = await prepare({
        expectedHash: hash(SAFE_A, '1', transactionA),
        confirmations: [{ owner: COOWNER, signature: SIGNATURE }],
      });
      const originalSafe = safeInstances[0];
      await keyring.buildTransaction(
        otherSafe,
        transactionB,
        {},
        '1.3.0',
        '10'
      );

      expect(
        keyring.getApprovalTypedData('approval-A', prepared.transactionHash)
      ).toEqual(prepared.typedData);
      expect(
        keyring.getApprovalTypedData('approval-A', prepared.transactionHash)
          .message.to
      ).toBe(OWNER);
      await keyring.submitApprovalSignature(
        'approval-A',
        prepared.transactionHash,
        OWNER,
        SIGNATURE
      );

      expect(
        originalSafe.request.confirmTransaction
      ).toHaveBeenCalledWith(prepared.transactionHash, {
        signature: SIGNATURE,
      });
      expect(
        safeInstances[1].request.confirmTransaction
      ).not.toHaveBeenCalled();
      expect(keyring.currentTransaction!.signatures.size).toBe(0);
    }
  );

  test('posts a new proposal from A even after shared state is replaced by B', async () => {
    const prepared = await prepare();
    const originalSafe = safeInstances[0];
    await keyring.buildTransaction(SAFE_B, transactionB, {}, '1.3.0', '10');
    await keyring.submitApprovalSignature(
      'approval-A',
      prepared.transactionHash,
      OWNER,
      SIGNATURE
    );
    expect(originalSafe.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ data: transactionA }),
      prepared.transactionHash
    );
    expect(safeInstances[1].postTransaction).not.toHaveBeenCalled();
  });

  test('rejects a proposal whose rebuilt hash differs from the reviewed hash', async () => {
    await expect(
      prepare({ expectedHash: hash(SAFE_A, '1', transactionB) })
    ).rejects.toThrow('does not match');
    expect(() =>
      keyring.getApprovalTypedData(
        'approval-A',
        hash(SAFE_A, '1', transactionA)
      )
    ).toThrow('no longer current');
  });

  test('rechecks approval identity after asynchronous construction', async () => {
    const assertCurrentApproval = jest
      .fn()
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('cancelled');
      });
    await expect(prepare({ assertCurrentApproval })).rejects.toThrow(
      'cancelled'
    );
    expect(() =>
      keyring.getApprovalTypedData(
        'approval-A',
        hash(SAFE_A, '1', transactionA)
      )
    ).toThrow();
  });

  test('does not publish partially built state while hash computation is pending', async () => {
    const prepared = await prepare();
    let finishHash!: (value: string) => void;
    const pendingHash = new Promise<string>((resolve) => {
      finishHash = resolve;
    });
    (Safe as unknown as jest.Mock).mockImplementationOnce(
      (...args: Parameters<typeof createSafe>) => {
        const safe = createSafe(...args);
        safe.getTransactionHash.mockReturnValueOnce(pendingHash);
        return safe;
      }
    );
    const pending = prepare({
      approvalId: 'approval-B',
      address: SAFE_B,
      transaction: transactionB,
    });
    await Promise.resolve();
    expect(
      keyring.getApprovalTypedData('approval-A', prepared.transactionHash)
    ).toEqual(prepared.typedData);
    finishHash(hash(SAFE_B, '1', transactionB));
    await pending;
    expect(() =>
      keyring.getApprovalTypedData('approval-A', prepared.transactionHash)
    ).toThrow();
  });

  test('a failed create retries A as a create, without retaining a rejected signature', async () => {
    const prepared = await prepare();
    const safe = safeInstances[0];
    safe.postTransaction.mockRejectedValueOnce(new Error('offline'));
    await expect(
      keyring.submitApprovalSignature(
        'approval-A',
        prepared.transactionHash,
        OWNER,
        SIGNATURE
      )
    ).rejects.toThrow('offline');
    expect(
      keyring.getApprovalTransaction('approval-A', prepared.transactionHash)
        .transaction.signatures.size
    ).toBe(0);
    await keyring.submitApprovalSignature(
      'approval-A',
      prepared.transactionHash,
      OWNER,
      SIGNATURE
    );
    expect(safe.postTransaction).toHaveBeenCalledTimes(2);
    expect(safe.request.confirmTransaction).not.toHaveBeenCalled();
  });

  test('rejects missing, stale or mismatched binding before submission', async () => {
    const prepared = await prepare();
    for (const [id, txHash] of [
      ['', prepared.transactionHash],
      ['other', prepared.transactionHash],
      ['approval-A', ''],
      ['approval-A', '0xwrong'],
    ]) {
      await expect(
        keyring.submitApprovalSignature(id, txHash, OWNER, SIGNATURE)
      ).rejects.toThrow('no longer current');
    }
    expect(safeInstances[0].postTransaction).not.toHaveBeenCalled();
  });

  test('lock cleanup invalidates the snapshot and a successful submission cannot be replayed', async () => {
    let prepared = await prepare();
    keyring.cleanUp();
    await expect(
      keyring.submitApprovalSignature(
        'approval-A',
        prepared.transactionHash,
        OWNER,
        SIGNATURE
      )
    ).rejects.toThrow();
    prepared = await prepare();
    await keyring.submitApprovalSignature(
      'approval-A',
      prepared.transactionHash,
      OWNER,
      SIGNATURE
    );
    await expect(
      keyring.submitApprovalSignature(
        'approval-A',
        prepared.transactionHash,
        OWNER,
        SIGNATURE
      )
    ).rejects.toThrow();
  });
});
