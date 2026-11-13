import { EthSafeTransaction } from '@safe-global/protocol-kit';
import GnosisKeyring from '@/background/service/keyring/eth-gnosis-keyring';

const OWNER = '0x57f2000000000000000000000000000000007758';
const SAFE = '0xd553500000000000000000000000000000a533c0';
const ZERO = '0x0000000000000000000000000000000000000000';
const HASH_A = `0x${'11'.repeat(32)}`;
const HASH_B = `0x${'22'.repeat(32)}`;
const SIGNATURE = `0x${'ab'.repeat(64)}1b`;

const createTransaction = (operation: 0 | 1) =>
  new EthSafeTransaction({
    to: SAFE,
    value: '0',
    data: '0x',
    operation,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ZERO,
    refundReceiver: ZERO,
    nonce: 0,
  });

const createKeyring = (hash: string, operation: 0 | 1) => {
  const keyring = new GnosisKeyring();
  const safe = {
    version: '1.3.0',
    safeAddress: SAFE,
    network: '1',
    getTransactionHash: jest.fn().mockResolvedValue(hash),
    postTransaction: jest.fn(),
    request: { confirmTransaction: jest.fn() },
  };
  keyring.safeInstance = safe as any;
  keyring.currentTransaction = createTransaction(operation);
  keyring.currentTransactionHash = hash;
  return { keyring, safe };
};

describe('Gnosis signing transaction binding', () => {
  it('preserves DELEGATECALL in the typed data sent to the owner signer', () => {
    const { keyring } = createKeyring(HASH_A, 1);

    const typedData = keyring.generateTypedData(HASH_A);

    expect(typedData?.message.operation).toBe(1);
  });

  it('rejects typed-data generation after another proposal replaces the current one', () => {
    const { keyring } = createKeyring(HASH_A, 0);
    const replacement = createTransaction(1);

    keyring.currentTransaction = replacement;
    keyring.currentTransactionHash = HASH_B;

    expect(() => keyring.generateTypedData(HASH_A)).toThrow(
      'Safe transaction changed'
    );
  });

  it('never confirms or posts a replacement proposal with the original hash', async () => {
    const { keyring, safe } = createKeyring(HASH_A, 0);
    keyring.currentTransaction = createTransaction(1);
    keyring.currentTransactionHash = HASH_B;

    await expect(
      keyring.addConfirmation(OWNER, SIGNATURE, HASH_A)
    ).rejects.toThrow('Safe transaction changed');
    await expect(keyring.postTransaction(HASH_A)).rejects.toThrow(
      'Safe transaction changed'
    );

    expect(safe.request.confirmTransaction).not.toHaveBeenCalled();
    expect(safe.postTransaction).not.toHaveBeenCalled();
  });

  it('still confirms the transaction whose hash was reviewed', async () => {
    const { keyring, safe } = createKeyring(HASH_A, 0);

    await keyring.addConfirmation(OWNER, SIGNATURE, HASH_A);

    expect(safe.request.confirmTransaction).toHaveBeenCalledWith(HASH_A, {
      signature: SIGNATURE,
    });
  });
});
