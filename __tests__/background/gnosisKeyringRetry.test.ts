import {
  EthSafeMessage,
  EthSafeSignature,
  EthSafeTransaction,
} from '@safe-global/protocol-kit';
import GnosisKeyring, {
  submitWithSignature,
} from '@/background/service/keyring/eth-gnosis-keyring';

const OWNER_A = '0x57f2000000000000000000000000000000007758';
const OWNER_B = '0xd553500000000000000000000000000000a533c0';
const SIG_A = `0x${'ab'.repeat(64)}1b`;
const SIG_B = `0x${'cd'.repeat(64)}1c`;
const MESSAGE_HASH = `0x${'e8'.repeat(32)}`;
const TX_HASH = `0x${'11'.repeat(32)}`;
const ZERO = '0x0000000000000000000000000000000000000000';

const notFound = () =>
  Object.assign(new Error('Request failed with status code 404'), {
    response: { status: 404, data: { detail: 'Not found.' } },
  });

const transient = () =>
  Object.assign(new Error('Request failed with status code 429'), {
    response: { status: 429, data: {} },
  });

/**
 * Mirrors WalletController.handleGnosisMessage: append when any signature is
 * already known locally, otherwise create the message.
 */
const handleGnosisMessage = (
  keyring: GnosisKeyring,
  args: { signerAddress: string; signature: string }
) =>
  keyring.currentSafeMessage!.signatures.size > 0
    ? keyring.addMessageSignature(args)
    : keyring.addMessage(args);

const createMessageKeyring = () => {
  const keyring = new GnosisKeyring();
  const safe = {
    addMessage: jest.fn(),
    addMessageSignature: jest.fn(),
  };
  keyring.safeInstance = safe as any;
  keyring.currentSafeMessage = new EthSafeMessage('hello');
  keyring.currentSafeMessageHash = MESSAGE_HASH;
  return { keyring, safe };
};

const createTransactionKeyring = () => {
  const keyring = new GnosisKeyring();
  const safe = {
    getTransactionHash: jest.fn().mockResolvedValue(TX_HASH),
    postTransaction: jest.fn(),
    request: { confirmTransaction: jest.fn() },
  };
  keyring.safeInstance = safe as any;
  keyring.currentTransaction = new EthSafeTransaction({
    to: OWNER_B,
    value: '0',
    data: '0x',
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ZERO,
    refundReceiver: ZERO,
    nonce: 0,
  });
  return { keyring, safe };
};

describe('submitWithSignature', () => {
  it('keeps the signature when the submit succeeds', async () => {
    const message = new EthSafeMessage('hello');
    const sig = new EthSafeSignature(OWNER_A, SIG_A);

    await submitWithSignature(message, sig, async () => undefined);

    expect(message.getSignature(OWNER_A)).toBe(sig);
  });

  it('removes a new signature when the submit fails', async () => {
    const message = new EthSafeMessage('hello');

    await expect(
      submitWithSignature(
        message,
        new EthSafeSignature(OWNER_A, SIG_A),
        async () => {
          throw transient();
        }
      )
    ).rejects.toThrow('429');

    expect(message.signatures.size).toBe(0);
  });

  it('restores the earlier signature of the same signer when the submit fails', async () => {
    const message = new EthSafeMessage('hello');
    const earlier = new EthSafeSignature(OWNER_A, SIG_A);
    message.addSignature(earlier);

    await expect(
      submitWithSignature(
        message,
        new EthSafeSignature(OWNER_A, SIG_B),
        async () => {
          throw transient();
        }
      )
    ).rejects.toThrow();

    expect(message.getSignature(OWNER_A)).toBe(earlier);
    expect(message.signatures.size).toBe(1);
  });
});

describe('GnosisKeyring Safe message retry', () => {
  it('creates the message again on retry after a failed create, instead of appending to a message that does not exist', async () => {
    const { keyring, safe } = createMessageKeyring();
    safe.addMessage
      .mockRejectedValueOnce(transient())
      .mockResolvedValueOnce(undefined);

    await expect(
      handleGnosisMessage(keyring, { signerAddress: OWNER_A, signature: SIG_A })
    ).rejects.toThrow('429');
    expect(keyring.currentSafeMessage!.signatures.size).toBe(0);

    await handleGnosisMessage(keyring, {
      signerAddress: OWNER_A,
      signature: SIG_A,
    });

    expect(safe.addMessageSignature).not.toHaveBeenCalled();
    expect(safe.addMessage).toHaveBeenCalledTimes(2);
    const posted = safe.addMessage.mock.calls[1][0].safeMessage;
    expect(Array.from(posted.signatures.keys())).toEqual([
      OWNER_A.toLowerCase(),
    ]);
    expect(keyring.currentSafeMessage!.getSignature(OWNER_A)).toBeDefined();
  });

  it('keeps server confirmations and drops only its own signature when appending fails', async () => {
    const { keyring, safe } = createMessageKeyring();
    await keyring.addPureMessageSignature({
      signerAddress: OWNER_B,
      signature: SIG_B,
    });
    safe.addMessageSignature.mockRejectedValueOnce(transient());

    await expect(
      handleGnosisMessage(keyring, { signerAddress: OWNER_A, signature: SIG_A })
    ).rejects.toThrow('429');

    expect(safe.addMessageSignature).toHaveBeenCalledWith(
      MESSAGE_HASH,
      expect.any(String)
    );
    expect(Array.from(keyring.currentSafeMessage!.signatures.keys())).toEqual([
      OWNER_B.toLowerCase(),
    ]);
  });
});

describe('GnosisKeyring Safe transaction retry', () => {
  it('drops collected signatures when creating the transaction fails, so the retry creates it again', async () => {
    const { keyring, safe } = createTransactionKeyring();
    safe.postTransaction.mockRejectedValueOnce({
      response: { data: { nonce: ['Nonce too low'] } },
    });

    await keyring.addSignature(OWNER_A, SIG_A);
    await expect(keyring.postTransaction()).rejects.toThrow('Nonce too low');

    expect(keyring.currentTransaction!.signatures.size).toBe(0);
    expect(safe.request.confirmTransaction).not.toHaveBeenCalled();
  });

  it('removes its own signature when confirming fails and keeps server confirmations', async () => {
    const { keyring, safe } = createTransactionKeyring();
    await keyring.addPureSignature(OWNER_B, SIG_B);
    safe.request.confirmTransaction.mockRejectedValueOnce(notFound());

    await expect(keyring.addConfirmation(OWNER_A, SIG_A)).rejects.toThrow(
      '404'
    );

    expect(safe.request.confirmTransaction).toHaveBeenCalledWith(TX_HASH, {
      signature: SIG_A,
    });
    expect(Array.from(keyring.currentTransaction!.signatures.keys())).toEqual([
      OWNER_B.toLowerCase(),
    ]);
  });

  it('keeps its signature when confirming succeeds', async () => {
    const { keyring, safe } = createTransactionKeyring();
    safe.request.confirmTransaction.mockResolvedValueOnce(undefined);

    await keyring.addConfirmation(OWNER_A, SIG_A);

    expect(keyring.currentTransaction!.getSignature(OWNER_A)?.data).toBe(SIG_A);
  });
});
