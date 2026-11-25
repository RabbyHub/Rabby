import { KeyringService } from '@/background/service/keyring';
import { KEYRING_CLASS } from 'consts';

jest.mock('@/background/service/preference', () => ({}));
jest.mock('@/background/service/contactBook', () => ({}));
jest.mock('@/background/service/uninstalled', () => ({}));
jest.mock('@/background/service/i18n', () => ({}));
jest.mock('@/utils/walletconnect', () => ({}));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));

// The service coordinates each keyring here without opening its real transport.
jest.mock('@/background/service/keyring/eth-ledger-keyring', () => class {});
jest.mock('@/background/service/keyring/bridge', () => ({}));
jest.mock('@/background/service/keyring/eth-gnosis-keyring', () => class {});
jest.mock(
  '@/background/service/keyring/eth-onekey-keyring/eth-onekey-keyring',
  () => class {}
);

describe('OneKey signing lifecycle', () => {
  const address = '0x00000000000000000000000000000000000000AB';
  let service: KeyringService;
  beforeEach(() => {
    service = new KeyringService();
  });

  it('invalidates the registered and importing device immediately and waits only for local cleanup', async () => {
    let erase!: () => void;
    const stored = {
      type: KEYRING_CLASS.HARDWARE.ONEKEY,
      cancelPendingWork: jest.fn(() => new Promise(() => undefined)),
      cleanUp: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            erase = resolve;
          })
      ),
    };
    const importing = {
      type: stored.type,
      cancelPendingWork: jest.fn(),
      cleanUp: jest.fn(),
    };
    service.keyrings = [stored];
    const locked = jest.fn();
    service.on('lock', locked);
    const locking = service.setLocked([stored, importing]);
    expect(stored.cancelPendingWork).toHaveBeenCalledTimes(1);
    expect(importing.cancelPendingWork).toHaveBeenCalledTimes(1);
    expect(stored.cleanUp).toHaveBeenCalledTimes(1);
    expect(importing.cleanUp).toHaveBeenCalledTimes(1);
    expect(service.keyrings).toHaveLength(0);
    expect(locked).not.toHaveBeenCalled();
    erase();
    await locking;
    expect(locked).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'failure'])(
    'persists a verified session repair after a signing %s',
    async (result) => {
      const persist = jest
        .spyOn(service, 'persistUpdate')
        .mockResolvedValue(service.memStore.getState());
      jest.spyOn(service, 'isUnlocked').mockReturnValue(true);
      const keyring = {
        type: KEYRING_CLASS.HARDWARE.ONEKEY,
        consumePassphraseStateCleared: jest
          .fn()
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        consumeDeviceProtocolsChanged: jest.fn().mockReturnValueOnce(true),
        signPersonalMessage: jest.fn().mockResolvedValue('signature'),
      };
      service.keyrings = [keyring];
      if (result === 'failure')
        keyring.signPersonalMessage.mockRejectedValueOnce(
          new Error('cancelled')
        );
      const message = { from: address, data: '0x01' };
      const first = service.signPersonalMessage(keyring, message);
      if (result === 'success') await expect(first).resolves.toBe('signature');
      else await expect(first).rejects.toThrow('cancelled');
      await service.signPersonalMessage(keyring, message);
      expect(persist).toHaveBeenCalledTimes(1);
      expect(keyring.consumeDeviceProtocolsChanged).toHaveBeenCalledTimes(2);
    }
  );

  it('retries a failed protocol write on the next operation without repeating the signature', async () => {
    jest.spyOn(service, 'isUnlocked').mockReturnValue(true);
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.ONEKEY,
      consumePassphraseStateCleared: jest.fn().mockReturnValue(false),
      consumeDeviceProtocolsChanged: jest.fn().mockReturnValueOnce(true),
      signPersonalMessage: jest.fn().mockResolvedValue('signature'),
    };
    service.keyrings = [keyring];
    const persist = jest
      .spyOn(service, 'persistAllKeyrings')
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValue(true);
    const message = { from: address, data: '0x01' };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await expect(service.signPersonalMessage(keyring, message)).resolves.toBe(
        'signature'
      );
      await service.withOneKeyPersistence(keyring, () => 'already unlocked');
      await service.withOneKeyPersistence(keyring, () => 'already unlocked');
      expect(keyring.signPersonalMessage).toHaveBeenCalledTimes(1);
      expect(persist).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  it('keeps a temporary import or a result arriving after lock out of the vault', async () => {
    const unlocked = jest.spyOn(service, 'isUnlocked').mockReturnValue(true);
    const persist = jest.spyOn(service, 'persistAllKeyrings');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.ONEKEY,
      consumePassphraseStateCleared: jest.fn(),
      consumeDeviceProtocolsChanged: jest.fn().mockReturnValue(true),
    };
    await service.withOneKeyPersistence(keyring, () => 'just unlocked');
    service.keyrings = [keyring];
    await service.withOneKeyPersistence(keyring, () => {
      unlocked.mockReturnValue(false);
    });
    expect(keyring.consumeDeviceProtocolsChanged).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });
});
