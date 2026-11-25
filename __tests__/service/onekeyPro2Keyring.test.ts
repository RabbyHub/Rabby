/** @jest-environment node */
import HDKey from 'hdkey';
import {
  bytesToHex,
  publicToAddress,
  toChecksumAddress,
} from '@ethereumjs/util';
import { FeeMarketEIP1559Transaction, LegacyTransaction } from '@ethereumjs/tx';
import {
  personalSign,
  signTypedData,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import browser from 'webextension-polyfill';
import OneKeyKeyring from '@/background/service/keyring/eth-onekey-keyring/eth-onekey-keyring';

jest.mock('@/utils/env', () => ({ isManifestV3: true }));
jest.mock('@/background/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));
jest.mock('@/constant', () => ({
  EVENTS: { ONEKEY: { REQUEST_PERMISSION_WEBUSB: 'usb' } },
}));
jest.mock('@/eventBus', () => ({ emit: jest.fn() }));
jest.mock('i18next', () => ({ t: (key: string) => key }));
jest.mock('webextension-polyfill', () => ({
  storage: {
    session: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
}));

const ok = (payload: any) => ({ success: true, payload });
const failure = (code: number, error: string) => ({
  success: false,
  payload: { code, error },
});
const storage = browser.storage.session as jest.Mocked<
  typeof browser.storage.session
>;
const path = "m/44'/60'/0'/0";
const base = HDKey.fromMasterSeed(Buffer.alloc(32, 9)).derive(path);
const first = base.derive('m/0');
const addr = toChecksumAddress(
  bytesToHex(publicToAddress(first.publicKey, true))
);
const pub = (key: HDKey) =>
  ok({
    pub: key.publicKey.toString('hex'),
    node: { chain_code: key.chainCode.toString('hex') },
  });
const passphraseOff = failure(
  HardwareErrorCode.DeviceNotOpenedPassphrase,
  'Passphrase disabled'
);
const data = '0x1234';
const signature = (key: HDKey = first) =>
  personalSign({ privateKey: key.privateKey, data });
const state = (status = {}, protocol = 'V2', id = 'device') =>
  ok({
    protocol,
    identity: { deviceId: id, deviceType: 'pro' },
    status,
  });

function setup(status = { passphraseProtection: false }, protocol = 'V2') {
  const bridge = {
    init: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    searchDevices: jest
      .fn()
      .mockResolvedValue(ok([{ connectId: 'usb', deviceId: 'discovery-id' }])),
    setDeviceConnectProtocol: jest.fn().mockResolvedValue(undefined),
    getDeviceState: jest.fn().mockResolvedValue(state(status, protocol)),
    openWalletSession: jest
      .fn()
      .mockResolvedValue(ok({ walletType: 'standard', passphraseState: null })),
    getPassphraseState: jest.fn().mockResolvedValue(ok('standard-id')),
    evmGetPublicKey: jest.fn().mockResolvedValue(pub(base)),
    evmSignMessage: jest
      .fn()
      .mockResolvedValue(
        ok({ address: addr.toLowerCase(), signature: signature().slice(2) })
      ),
    evmSignTypedData: jest.fn(),
    evmSignTransaction: jest.fn(),
  };
  const ring = new OneKeyKeyring({ bridge });
  return { bridge, ring };
}

function gate<T>() {
  let resolve!: (result: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

beforeEach(() => {
  jest.clearAllMocks();
  storage.get.mockResolvedValue({});
  storage.set.mockResolvedValue(undefined);
  storage.remove.mockResolvedValue(undefined);
});

it('awaits initialization, resolves the live identity and coalesces concurrent imports', async () => {
  const { bridge, ring } = setup();
  const initialized = gate<void>();
  bridge.init.mockReturnValueOnce(initialized.promise);
  const unlocked = Promise.all([ring.unlock(), ring.getAddresses(0, 1)]);
  expect(bridge.searchDevices).not.toHaveBeenCalled();
  initialized.resolve();
  await unlocked;
  expect(bridge.searchDevices).toHaveBeenCalledTimes(1);
  expect(bridge.openWalletSession).toHaveBeenCalledWith('usb', {
    mode: 'standard',
  });
  expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
    'usb',
    'device',
    expect.objectContaining({ path, useEmptyPassphrase: true })
  );
  expect(ring.indexFromAddress(addr)).toBe(0);
  await ring.addAccounts();
  ring.accountDetails[addr].passphraseState = 'outdated';
  await ring.addAccounts();
  expect(ring.accounts).toEqual([addr]);
  expect(ring.accountDetails[addr]).toMatchObject({
    index: 0,
    hdPath: path + '/0',
    passphraseState: undefined,
  });
});

it('preserves the V1 wallet identifier without probing or opening a V2 session', async () => {
  const { bridge, ring } = setup({ passphraseProtection: true }, 'V1');
  bridge.getPassphraseState.mockResolvedValue(ok('v1-wallet'));
  await ring.unlock();
  expect(bridge.getPassphraseState).toHaveBeenCalledTimes(1);
  expect(bridge.openWalletSession).not.toHaveBeenCalled();
  expect(ring.passphraseState).toBe('v1-wallet');
});

it.each([
  [true, 'standard-id', undefined],
  [true, 'real-hidden-id', 'real-hidden-id'],
  [false, 'standard-id', undefined],
  [false, 'real-hidden-id', 'real-hidden-id'],
])(
  'selects the correct Pro 2 wallet when unlocked=%s and the id is %s',
  async (unlocked, id, expected) => {
    const { bridge, ring } = setup({ passphraseProtection: true });
    bridge.getDeviceState.mockResolvedValue(
      state({ unlocked, unlockedAttachPin: false, passphraseProtection: true })
    );
    if (unlocked) bridge.getPassphraseState.mockResolvedValueOnce(ok(id));
    else
      bridge.openWalletSession.mockResolvedValue(
        ok({ walletType: 'hidden', passphraseState: id })
      );
    await ring.unlock();
    expect(ring.passphraseState).toBe(expected);
    expect(bridge.openWalletSession).toHaveBeenCalledTimes(unlocked ? 0 : 1);
    expect(bridge.getPassphraseState).toHaveBeenLastCalledWith('usb', {
      useEmptyPassphrase: true,
    });
  }
);

it('preserves a newly unlocked attach-PIN session without probing the main wallet', async () => {
  const { bridge, ring } = setup({ passphraseProtection: true });
  bridge.getDeviceState
    .mockResolvedValueOnce(
      state({ unlocked: false, passphraseProtection: true })
    )
    .mockResolvedValueOnce(
      state({
        unlocked: true,
        unlockedAttachPin: true,
        passphraseProtection: true,
      })
    );
  bridge.openWalletSession.mockResolvedValue(
    ok({ walletType: 'hidden', passphraseState: 'attached' })
  );
  await ring.unlock();
  expect(bridge.openWalletSession).toHaveBeenCalledWith('usb', {
    mode: 'select-hidden',
  });
  expect(bridge.getPassphraseState).not.toHaveBeenCalled();
  expect(ring.passphraseState).toBe('attached');
});

it('falls back only when the session API is unsupported and propagates device cancellation', async () => {
  const { bridge, ring } = setup({ passphraseProtection: true });
  bridge.openWalletSession.mockResolvedValueOnce(
    failure(-32601, 'Method not found')
  );
  bridge.getPassphraseState
    .mockResolvedValueOnce(ok('hidden'))
    .mockResolvedValueOnce(
      failure(HardwareErrorCode.PinCancelled, 'cancelled')
    );
  await expect(ring.unlock()).rejects.toMatchObject({
    code: HardwareErrorCode.PinCancelled,
  });
  expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();
});

it('retries failed initialization and never caches the identity when reading the key fails', async () => {
  const { bridge, ring } = setup();
  bridge.init.mockRejectedValueOnce(new Error('relay unavailable'));
  await expect(ring.unlock()).rejects.toThrow('relay unavailable');
  bridge.evmGetPublicKey.mockRejectedValueOnce(
    Object.assign(new Error('device busy'), {
      code: HardwareErrorCode.DeviceBusy,
    })
  );
  await expect(ring.unlock()).rejects.toMatchObject({
    code: HardwareErrorCode.DeviceBusy,
  });
  expect(ring.deviceId).toBeNull();
  expect(ring.isUnlocked()).toBe(false);
  expect(storage.set).not.toHaveBeenCalled();
  await expect(ring.unlock()).resolves.toBe('just unlocked');
});

it('clears an obsolete id only after deriving the requested child address and retries once', async () => {
  const { bridge, ring } = setup();
  await ring.addAccounts();
  ring.accountDetails[addr].passphraseState = 'old-standard';
  ring.passphraseState = 'old-standard';
  bridge.evmSignMessage.mockResolvedValueOnce(passphraseOff);
  bridge.evmGetPublicKey.mockResolvedValueOnce(pub(first));
  await expect(ring.signPersonalMessage(addr, data)).resolves.toBe(signature());
  expect(bridge.evmGetPublicKey).toHaveBeenLastCalledWith(
    'usb',
    'device',
    expect.objectContaining({ path: path + '/0', useEmptyPassphrase: true })
  );
  expect(bridge.evmSignMessage).toHaveBeenCalledTimes(2);
  expect(bridge.evmSignMessage).toHaveBeenLastCalledWith(
    'usb',
    'device',
    expect.objectContaining({
      passphraseState: undefined,
      useEmptyPassphrase: true,
    })
  );
  expect(ring.accountDetails[addr].passphraseState).toBeUndefined();
  expect(ring.consumePassphraseStateCleared()).toBe(true);
  expect(ring.consumePassphraseStateCleared()).toBe(false);
  expect(storage.remove).toHaveBeenCalledWith('onekeySessionState');
});

it('does not retry a hidden wallet with the standard wallet or accept a signature from a different signer', async () => {
  const { bridge, ring } = setup();
  await ring.addAccounts();
  ring.accountDetails[addr].passphraseState = 'hidden-id';
  bridge.evmSignMessage.mockResolvedValueOnce(passphraseOff);
  bridge.evmGetPublicKey.mockResolvedValueOnce(pub(base.derive('m/1')));
  await expect(ring.signPersonalMessage(addr, data)).rejects.toMatchObject({
    code: HardwareErrorCode.DeviceNotOpenedPassphrase,
  });
  expect(ring.accountDetails[addr].passphraseState).toBe('hidden-id');
  expect(bridge.evmSignMessage).toHaveBeenCalledTimes(1);
  bridge.evmSignMessage.mockResolvedValueOnce(
    ok({ address: addr, signature: signature(base.derive('m/1')).slice(2) })
  );
  await expect(ring.signPersonalMessage(addr, data)).rejects.toThrow(
    'signature doesnt match'
  );
});

it.each([SignTypedDataVersion.V3, SignTypedDataVersion.V4] as const)(
  'validates a %s signature against the full original typed data',
  async (version) => {
    const { bridge, ring } = setup();
    await ring.addAccounts();
    const typed = {
      types: {
        EIP712Domain: [{ name: 'chainId', type: 'uint256' }],
        Message: [{ name: 'n', type: 'uint256' }],
      },
      primaryType: 'Message' as const,
      domain: { chainId: 1 },
      message: { n: 42 },
    };
    const signed = signTypedData({
      privateKey: first.privateKey,
      version,
      data: typed,
    });
    bridge.evmSignTypedData.mockResolvedValue(
      ok({ address: addr.toLowerCase(), signature: signed.slice(2) })
    );
    await expect(ring.signTypedData(addr, typed, { version })).resolves.toBe(
      signed
    );
    await expect(
      ring.signTypedData(addr, { ...typed, message: { n: 9 } }, { version })
    ).rejects.toThrow('signature doesnt match');
  }
);

it.each([
  LegacyTransaction.fromTxData({}),
  FeeMarketEIP1559Transaction.fromTxData({}),
])('validates the sender of a signed Ethereum transaction', async (tx) => {
  const { bridge, ring } = setup();
  await ring.addAccounts();
  const signed = tx.sign(first.privateKey);
  bridge.evmSignTransaction.mockResolvedValue(
    ok({
      v: signed.v!.toString(16),
      r: signed.r!.toString(16),
      s: signed.s!.toString(16),
    })
  );
  await expect(ring.signTransaction(addr, tx)).resolves.toMatchObject({
    v: signed.v,
    r: signed.r,
    s: signed.s,
  });
});

it('ignores a late signature after approval cancellation but preserves an independent approval on import-page cleanup', async () => {
  const { bridge, ring } = setup();
  await ring.addAccounts();
  const started = gate<void>();
  const result = gate<ReturnType<typeof ok>>();
  bridge.evmSignMessage.mockImplementationOnce(() => {
    started.resolve();
    return result.promise;
  });
  const signing = ring.signPersonalMessage(addr, data);
  await started.promise;
  await ring.cleanUp(true);
  expect(bridge.cancel).not.toHaveBeenCalled();
  await ring.cancelPendingWork();
  await ring.cleanUp();
  result.resolve(ok({ signature: signature().slice(2) }));
  await expect(signing).rejects.toThrow('cancelled');
  expect(bridge.cancel).toHaveBeenCalledWith('usb');
  expect(ring.deviceId).toBeNull();
  expect(ring.isUnlocked()).toBe(false);
});

it('prevents a late key read or pending MV3 restore from reviving a discarded session', async () => {
  const { bridge, ring } = setup();
  const started = gate<void>();
  const result = gate<ReturnType<typeof pub>>();
  bridge.evmGetPublicKey.mockImplementationOnce(() => {
    started.resolve();
    return result.promise;
  });
  const unlocking = ring.unlock();
  await started.promise;
  await ring.cleanUp(true);
  result.resolve(pub(base));
  await expect(unlocking).rejects.toThrow('cancelled');
  expect(storage.set).not.toHaveBeenCalled();
  const restoring = gate<Record<string, unknown>>();
  storage.get.mockReturnValueOnce(restoring.promise);
  const next = new OneKeyKeyring({ bridge });
  const init = next.init();
  await Promise.resolve();
  await next.cleanUp();
  restoring.resolve({
    onekeySessionState: {
      deviceId: 'old',
      connectId: 'old',
      publicKey: base.publicKey.toString('hex'),
      chainCode: base.chainCode.toString('hex'),
    },
  });
  await init;
  expect(next.isUnlocked()).toBe(false);
});

it('reopens the standard wallet when the device reports that passphrase protection is now disabled', async () => {
  const { bridge, ring } = setup({ passphraseProtection: true });
  bridge.openWalletSession.mockResolvedValueOnce(passphraseOff);
  await ring.unlock();
  expect(bridge.openWalletSession.mock.calls).toEqual([
    ['usb', { mode: 'select-hidden' }],
    ['usb', { mode: 'standard' }],
  ]);
  expect(ring.passphraseState).toBeUndefined();
});

it('discards cached device identity if another connection fails its live identity read', async () => {
  const { bridge, ring } = setup();
  await ring.addAccounts();
  bridge.searchDevices.mockResolvedValue(ok([{ connectId: 'new-usb' }]));
  bridge.getDeviceState.mockResolvedValue(ok({ identity: {}, status: {} }));
  await expect(ring.signPersonalMessage(addr, data)).rejects.toMatchObject({
    code: HardwareErrorCode.DeviceNotFound,
  });
  expect(bridge.evmSignMessage).not.toHaveBeenCalled();
  expect(ring.deviceId).toBeNull();
  expect(ring.isUnlocked()).toBe(false);
  expect(storage.remove).toHaveBeenCalledWith('onekeySessionState');
});

it('reuses the locally verified wallet when discovery matches both cached IDs', async () => {
  const { bridge, ring } = setup();
  bridge.searchDevices.mockResolvedValue(
    ok([{ connectId: 'usb', deviceId: 'device' }])
  );
  await ring.unlock();
  bridge.setDeviceConnectProtocol.mockClear();
  bridge.getDeviceState.mockClear();
  bridge.openWalletSession.mockClear();
  bridge.evmGetPublicKey.mockClear();

  await expect(ring.unlock()).resolves.toBe('already unlocked');
  expect(bridge.searchDevices).toHaveBeenCalledTimes(2);
  expect(bridge.setDeviceConnectProtocol.mock.calls).toEqual([['usb', 'V2']]);
  expect(bridge.getDeviceState).not.toHaveBeenCalled();
  expect(bridge.openWalletSession).not.toHaveBeenCalled();
  expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();

  ring.beginImport();
  await expect(ring.unlock()).resolves.toBe('just unlocked');
  expect(bridge.getDeviceState).toHaveBeenCalledWith('usb');
  expect(bridge.openWalletSession).toHaveBeenCalledTimes(1);
  expect(bridge.evmGetPublicKey).toHaveBeenCalledTimes(1);
});

it.each([
  ['missing device ID', { connectId: 'usb' }, 'usb'],
  ['changed device ID', { connectId: 'usb', deviceId: 'other' }, 'usb'],
  [
    'changed connection',
    { connectId: 'other-usb', deviceId: 'device' },
    'other-usb',
  ],
])(
  'requires a live state read when discovery reports a %s',
  async (_label, device, expectedConnection) => {
    const { bridge, ring } = setup();
    await ring.unlock();
    bridge.searchDevices.mockResolvedValue(ok([device]));
    bridge.getDeviceState
      .mockClear()
      .mockRejectedValue(new Error('device unavailable'));
    await expect(ring.unlock()).rejects.toThrow('device unavailable');
    expect(bridge.getDeviceState).toHaveBeenCalledWith(expectedConnection);
  }
);

it('does not use a cached device when discovery omits the connection ID', async () => {
  const { bridge, ring } = setup();
  await ring.unlock();
  bridge.searchDevices.mockResolvedValue(ok([{ deviceId: 'device' }]));
  bridge.getDeviceState.mockClear();
  await expect(ring.unlock()).rejects.toMatchObject({
    code: HardwareErrorCode.DeviceNotFound,
  });
  expect(bridge.getDeviceState).toHaveBeenCalledWith();
});

it('revalidates the wallet after an MV3 restart and reuses it for subsequent pages', async () => {
  const { bridge, ring } = setup();
  storage.get.mockResolvedValue({
    onekeySessionState: {
      deviceId: 'device',
      connectId: 'usb',
      publicKey: base.publicKey.toString('hex'),
      chainCode: base.chainCode.toString('hex'),
    },
  });
  await expect(ring.unlock()).resolves.toBe('just unlocked');
  await expect(ring.unlock()).resolves.toBe('already unlocked');
  expect(storage.get).toHaveBeenCalledTimes(1);
  expect(bridge.init).toHaveBeenCalledTimes(2);
  expect(bridge.getDeviceState).toHaveBeenCalledTimes(3);
  expect(bridge.evmGetPublicKey).toHaveBeenCalledTimes(1);
});

it('releases a cancelled 113 recovery before the device acknowledges it and never retries with a late result', async () => {
  const { bridge, ring } = setup();
  await ring.addAccounts();
  ring.accountDetails[addr].passphraseState = 'old-id';
  bridge.evmSignMessage.mockResolvedValueOnce(passphraseOff);
  const started = gate<void>();
  const result = gate<ReturnType<typeof pub>>();
  bridge.evmGetPublicKey.mockImplementationOnce(() => {
    started.resolve();
    return result.promise;
  });
  const signing = ring.signPersonalMessage(addr, data);
  await started.promise;
  await ring.cancel();
  await expect(signing).rejects.toThrow('cancelled');
  result.resolve(pub(first));
  expect(bridge.evmSignMessage).toHaveBeenCalledTimes(1);
  expect(ring.accountDetails[addr].passphraseState).toBe('old-id');
  expect(ring.consumePassphraseStateCleared()).toBe(false);
});

it('uses the protocol restored during init to sign an old account with an empty passphrase', async () => {
  const { bridge, ring } = setup();
  bridge.searchDevices.mockResolvedValue(
    ok([{ connectId: 'usb', deviceId: 'device' }])
  );
  await ring.addAccounts();
  delete ring.accountDetails[addr].version;
  const started = gate<void>();
  const bound = gate<void>();
  bridge.searchDevices.mockClear();
  bridge.getDeviceState.mockClear();
  bridge.setDeviceConnectProtocol.mockClear().mockImplementationOnce(() => {
    started.resolve();
    return bound.promise;
  });
  const signing = ring.signPersonalMessage(addr, data);
  await started.promise;
  expect(bridge.searchDevices).not.toHaveBeenCalled();
  expect(bridge.evmSignMessage).not.toHaveBeenCalled();
  bound.resolve();
  await expect(signing).resolves.toBe(signature());
  expect(bridge.searchDevices).toHaveBeenCalledTimes(1);
  expect(bridge.getDeviceState).not.toHaveBeenCalled();
  expect(bridge.setDeviceConnectProtocol.mock.calls).toEqual([['usb', 'V2']]);
  expect(bridge.evmSignMessage).toHaveBeenCalledWith(
    'usb',
    'device',
    expect.objectContaining({ path: path + '/0', useEmptyPassphrase: true })
  );
});

it('rechecks wallet settings between imports on the same USB device without prompting on each page', async () => {
  const { bridge, ring } = setup();
  await ring.getAddresses(0, 1);
  bridge.getDeviceState.mockResolvedValue(
    state({
      passphraseProtection: true,
      unlocked: true,
      unlockedAttachPin: true,
    })
  );
  bridge.openWalletSession.mockResolvedValue(
    ok({ walletType: 'hidden', passphraseState: 'attached-a' })
  );
  bridge.evmGetPublicKey.mockResolvedValue(pub(base.derive('m/8')));
  const a = await ring.getAddresses(0, 1);
  expect(a[0].address).not.toBe(addr);
  expect(ring.passphraseState).toBe('attached-a');
  await ring.getAddresses(1, 2);
  expect(bridge.openWalletSession).toHaveBeenCalledTimes(2);

  // A second attach-PIN wallet has the same public lock/permission flags.
  ring.beginImport();
  bridge.openWalletSession.mockResolvedValue(
    ok({ walletType: 'hidden', passphraseState: 'attached-b' })
  );
  bridge.evmGetPublicKey.mockResolvedValue(pub(base.derive('m/9')));
  const b = await ring.getAddresses(0, 1);
  expect(b[0].address).not.toBe(a[0].address);
  expect(ring.passphraseState).toBe('attached-b');
  await ring.getAddresses(1, 2);
  expect(bridge.openWalletSession).toHaveBeenCalledTimes(3);
});

it('cancels during SDK initialization and never contacts the device when the old init finally resolves', async () => {
  const { bridge, ring } = setup();
  const initialized = gate<void>();
  bridge.init.mockReturnValueOnce(initialized.promise);
  const unlock = ring.unlock();
  await ring.cancelPendingWork();
  await expect(unlock).rejects.toThrow('cancelled');
  expect(bridge.cancel).not.toHaveBeenCalled();
  initialized.resolve();
  await Promise.resolve();
  expect(bridge.searchDevices).not.toHaveBeenCalled();
  expect(bridge.openWalletSession).not.toHaveBeenCalled();
});

it('preserves device-side cancellation during the 113 address check', async () => {
  const { bridge, ring } = setup();
  await ring.addAccounts();
  ring.accountDetails[addr].passphraseState = 'old-state';
  bridge.evmSignMessage.mockResolvedValueOnce(passphraseOff);
  bridge.evmGetPublicKey.mockRejectedValue(
    Object.assign(new Error('Device action cancelled'), {
      code: HardwareErrorCode.ActionCancelled,
    })
  );
  await expect(ring.signPersonalMessage(addr, data)).rejects.toMatchObject({
    code: HardwareErrorCode.ActionCancelled,
  });
  expect(bridge.evmSignMessage).toHaveBeenCalledTimes(1);
  expect(ring.accountDetails[addr].passphraseState).toBe('old-state');
});

describe('OneKey transport protocol cache', () => {
  it('restores all saved protocols during SDK initialization and confirms the active connection after discovery', async () => {
    const { ring, bridge } = setup();
    expect(ring.consumeDeviceProtocolsChanged()).toBe(false);
    await ring.unlock();
    expect(bridge.setDeviceConnectProtocol).toHaveBeenCalledWith('usb', 'V2');
    expect(ring.consumeDeviceProtocolsChanged()).toBe(true);
    expect(ring.consumeDeviceProtocolsChanged()).toBe(false);

    bridge.searchDevices.mockResolvedValue(ok([{ connectId: 'Second-USB' }]));
    bridge.getDeviceState.mockResolvedValue(state({}, 'V1', 'second-device'));
    await ring.unlock();
    expect(bridge.setDeviceConnectProtocol).not.toHaveBeenCalledWith(
      'Second-USB',
      'V2'
    );
    expect(bridge.setDeviceConnectProtocol).toHaveBeenCalledWith(
      'Second-USB',
      'V1'
    );
    expect(ring.consumeDeviceProtocolsChanged()).toBe(true);
    const snapshot = await ring.serialize();
    expect(snapshot.deviceProtocols).toEqual({ usb: 'V2', 'second-usb': 'V1' });

    const freshBridge = setup().bridge;
    freshBridge.searchDevices.mockResolvedValue(ok([{ connectId: 'USB' }]));
    const restored = new OneKeyKeyring({ ...snapshot, bridge: freshBridge });
    expect(freshBridge.init).not.toHaveBeenCalled();
    expect(freshBridge.setDeviceConnectProtocol).not.toHaveBeenCalled();
    expect(restored.consumeDeviceProtocolsChanged()).toBe(false);
    const initialized = gate<void>();
    freshBridge.init.mockReturnValueOnce(initialized.promise);
    const init = restored.init();
    expect(freshBridge.setDeviceConnectProtocol).not.toHaveBeenCalled();
    initialized.resolve();
    await init;
    expect(freshBridge.setDeviceConnectProtocol.mock.calls).toEqual([
      ['usb', 'V2'],
      ['second-usb', 'V1'],
    ]);
    expect(freshBridge.searchDevices).not.toHaveBeenCalled();
    expect(freshBridge.getDeviceState).not.toHaveBeenCalled();
    freshBridge.setDeviceConnectProtocol.mockClear();
    await restored.unlock();
    const bindings = freshBridge.setDeviceConnectProtocol.mock.calls.filter(
      ([connectId]) => connectId === 'USB'
    );
    expect(bindings).toEqual([
      ['USB', 'V2'],
      ['USB', 'V2'],
    ]);
    expect(freshBridge.getDeviceState).toHaveBeenCalledWith('USB');
    expect(restored.consumeDeviceProtocolsChanged()).toBe(false);
    expect((await restored.serialize()).deviceProtocols).toEqual(
      snapshot.deviceProtocols
    );
  });

  it.each([undefined, 'V3'])(
    'ignores an unconfirmed protocol (%s) in the vault and the state response',
    async (protocol) => {
      const { bridge } = setup();
      const ring = new OneKeyKeyring({
        bridge,
        deviceProtocols: { usb: protocol, ' ': 'V2' },
      });
      bridge.getDeviceState.mockResolvedValue(
        ok({ identity: { deviceId: 'device' }, status: {}, protocol })
      );
      await ring.unlock();
      expect(bridge.setDeviceConnectProtocol).not.toHaveBeenCalled();
      expect((await ring.serialize()).deviceProtocols).toEqual({});
      expect(ring.consumeDeviceProtocolsChanged()).toBe(false);
    }
  );

  it('remembers the reported protocol but rejects wallet operations when the live device identity is missing', async () => {
    const { ring, bridge } = setup();
    bridge.getDeviceState.mockResolvedValue(ok({ protocol: 'V2', status: {} }));
    await expect(ring.unlock()).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceNotFound,
    });
    expect(bridge.setDeviceConnectProtocol.mock.calls).toEqual([['usb', 'V2']]);
    expect((await ring.serialize()).deviceProtocols).toEqual({ usb: 'V2' });
    expect(ring.consumeDeviceProtocolsChanged()).toBe(true);
    expect(ring.isUnlocked()).toBe(false);
    expect(bridge.openWalletSession).not.toHaveBeenCalled();
    expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();
  });

  it('keeps transport protocols when forgetting accounts and the active wallet session', async () => {
    const { bridge, ring } = setup();
    await ring.addAccounts();
    expect(ring.accounts).toEqual([addr]);
    expect(ring.consumeDeviceProtocolsChanged()).toBe(true);
    bridge.setDeviceConnectProtocol.mockClear();
    await ring.forgetDevice();
    const saved = await ring.serialize();
    expect(saved.accounts).toEqual([]);
    expect(saved.accountDetails).toEqual({});
    expect(ring.isUnlocked()).toBe(false);
    expect(saved.deviceProtocols).toEqual({ usb: 'V2' });
    expect(ring.consumeDeviceProtocolsChanged()).toBe(false);
    expect(bridge.setDeviceConnectProtocol).not.toHaveBeenCalled();
  });

  it.each([
    [HardwareErrorCode.TransportInvalidProtobuf, 'invalid protobuf'],
    [800, 'Device protocol mismatch'],
  ])('replaces a stale binding after SDK failure %s', async (code, message) => {
    const { bridge } = setup();
    const ring = new OneKeyKeyring({
      bridge,
      deviceProtocols: { usb: 'V2', other: 'V2' },
    });
    bridge.searchDevices.mockResolvedValue(ok([{ connectId: 'USB' }]));
    bridge.getDeviceState
      .mockResolvedValueOnce(failure(code, message))
      .mockResolvedValueOnce(state({}, 'V1'));
    await ring.unlock();
    expect(bridge.setDeviceConnectProtocol.mock.calls).toEqual([
      ['usb', 'V2'],
      ['other', 'V2'],
      ['USB', 'V2'],
      ['USB', undefined],
      ['USB', 'V1'],
    ]);
    expect(bridge.getDeviceState.mock.calls).toEqual([
      ['USB'],
      ['USB', { forceProtocolDetection: true }],
    ]);
    expect((await ring.serialize()).deviceProtocols).toEqual({
      usb: 'V1',
      other: 'V2',
    });
    expect(ring.consumeDeviceProtocolsChanged()).toBe(true);
    expect(ring.consumeDeviceProtocolsChanged()).toBe(false);
  });

  it('attempts only one forced read when a thrown probe error and its retry both fail', async () => {
    const { bridge } = setup();
    const ring = new OneKeyKeyring({
      bridge,
      deviceProtocols: { usb: 'V2', other: 'V1' },
    });
    // Newer SDKs expose TransportProtocolProbeFailed as 604.
    bridge.getDeviceState
      .mockRejectedValueOnce(Object.assign(new Error('failed'), { code: 604 }))
      .mockResolvedValueOnce(
        failure(HardwareErrorCode.TransportInvalidProtobuf, 'invalid protobuf')
      );
    await expect(ring.unlock()).rejects.toMatchObject({
      code: HardwareErrorCode.TransportInvalidProtobuf,
    });
    expect(bridge.getDeviceState.mock.calls).toEqual([
      ['usb'],
      ['usb', { forceProtocolDetection: true }],
    ]);
    expect((await ring.serialize()).deviceProtocols).toEqual({ other: 'V1' });
    expect(ring.consumeDeviceProtocolsChanged()).toBe(true);
    expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();
  });

  it.each([
    [{ usb: 'V1' }, HardwareErrorCode.DeviceBusy, 'device busy'],
    [{ usb: 'V1' }, HardwareErrorCode.PinCancelled, 'protocol probe cancelled'],
    [
      { other: 'V1' },
      HardwareErrorCode.TransportInvalidProtobuf,
      'invalid protobuf',
    ],
  ])(
    'propagates %s / %s without clearing a binding or repeating the read',
    async (deviceProtocols, code, message) => {
      const { bridge } = setup();
      const ring = new OneKeyKeyring({ bridge, deviceProtocols });
      bridge.getDeviceState.mockResolvedValue(failure(code, message));
      await expect(ring.unlock()).rejects.toMatchObject({ code });
      expect(bridge.getDeviceState.mock.calls).toEqual([['usb']]);
      expect((await ring.serialize()).deviceProtocols).toEqual(deviceProtocols);
      expect(ring.consumeDeviceProtocolsChanged()).toBe(false);
    }
  );

  it('leaves the vault unchanged when an aborted probe returns a protocol after cancellation', async () => {
    const { ring, bridge } = setup();
    const started = gate<void>();
    const response = gate<ReturnType<typeof state>>();
    bridge.getDeviceState.mockImplementationOnce(() => {
      started.resolve();
      return response.promise;
    });
    const unlock = ring.unlock();
    await started.promise;
    await ring.cancel();
    await expect(unlock).rejects.toThrow('cancelled');
    response.resolve(state({}, 'V1'));
    await Promise.resolve();
    expect(bridge.getDeviceState).toHaveBeenCalledTimes(1);
    expect(bridge.setDeviceConnectProtocol).not.toHaveBeenCalledWith(
      'usb',
      'V1'
    );
    expect((await ring.serialize()).deviceProtocols).toEqual({});
    expect(ring.consumeDeviceProtocolsChanged()).toBe(false);
  });

  it('reprobes only the state read during signing and never repeats a signature request', async () => {
    const { ring, bridge } = setup();
    await ring.addAccounts();
    bridge.getDeviceState
      .mockClear()
      .mockResolvedValueOnce(failure(604, 'probe failed'))
      .mockResolvedValueOnce(state({}, 'V1'));
    bridge.evmSignMessage.mockResolvedValueOnce(
      failure(HardwareErrorCode.TransportInvalidProtobuf, 'invalid protobuf')
    );
    await expect(ring.signPersonalMessage(addr, data)).rejects.toMatchObject({
      code: HardwareErrorCode.TransportInvalidProtobuf,
    });
    expect(bridge.getDeviceState.mock.calls).toEqual([
      ['usb'],
      ['usb', { forceProtocolDetection: true }],
    ]);
    expect(bridge.evmSignMessage).toHaveBeenCalledTimes(1);
    expect((await ring.serialize()).deviceProtocols).toEqual({ usb: 'V1' });
  });
});
