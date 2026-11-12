/**
 * @jest-environment node
 */
import { EventEmitter } from 'events';
import HDKey from 'hdkey';
import TrezorKeyring from '@rabby-wallet/eth-trezor-keyring';

const path = "m/44'/60'/0'/0";
const address = '0x0000000000000000000000000000000000000001';

const publicKeyResult = (seed: number) => {
  const key = HDKey.fromMasterSeed(Buffer.alloc(32, seed)).derive(path);
  return {
    success: true,
    payload: [
      {
        serializedPath: path,
        publicKey: key.publicKey.toString('hex'),
        chainCode: key.chainCode.toString('hex'),
      },
    ],
  };
};

const makeBridge = () => ({
  init: jest.fn(),
  event: new EventEmitter(),
  connectDevices: new Set(),
  getPublicKey: jest.fn(),
  ethereumSignTypedData: jest.fn(),
});

describe('patched Trezor keyring', () => {
  it('reuses cached public keys until the bridge reports a device change', async () => {
    const bridge = makeBridge();
    const first = publicKeyResult(1);
    const second = publicKeyResult(2);
    bridge.getPublicKey.mockResolvedValueOnce(first);
    const keyring: any = new TrezorKeyring({ bridge } as any);

    await keyring.unlock();
    expect(keyring.hdkMap.get(path).publicKey.toString('hex')).toBe(
      first.payload[0].publicKey
    );
    await keyring.unlock();
    expect(bridge.getPublicKey).toHaveBeenCalledTimes(1);
    expect(keyring.hdkMap.get(path).publicKey.toString('hex')).toBe(
      first.payload[0].publicKey
    );

    bridge.event.emit('cleanUp', true);
    expect(keyring.hdkMap.size).toBe(0);

    bridge.getPublicKey.mockResolvedValueOnce(second);
    await keyring.unlock();
    expect(bridge.getPublicKey).toHaveBeenCalledTimes(2);
    expect(keyring.hdkMap.get(path).publicKey.toString('hex')).toBe(
      second.payload[0].publicKey
    );
    expect(bridge.getPublicKey).toHaveBeenLastCalledWith({
      bundle: [{ path, coin: 'ETH' }],
    });
  });

  it('passes V4 typed data without precomputed hashes and checks the signing address', async () => {
    const bridge = makeBridge();
    bridge.ethereumSignTypedData.mockResolvedValue({
      success: true,
      payload: { address, signature: '0xsignature' },
    });
    const keyring: any = new TrezorKeyring({ bridge } as any);
    // `toChecksumAddress` from the keyring's nested @ethereumjs/util rejects
    // Node's Buffer under jsdom (same issue as the skipped app-key test).
    keyring.getHdPath = jest.fn().mockResolvedValue(`${path}/0`);
    const data = {
      types: {
        EIP712Domain: [],
        Message: [{ name: 'value', type: 'uint256' }],
      },
      primaryType: 'Message',
      domain: {},
      message: { value: '42' },
    };

    await expect(
      keyring.signTypedData(address, data, { version: 'V4' })
    ).resolves.toBe('0xsignature');
    expect(bridge.ethereumSignTypedData).toHaveBeenCalledWith({
      path: `${path}/0`,
      data,
      metamask_v4_compat: true,
    });
    bridge.ethereumSignTypedData.mockResolvedValueOnce({
      success: true,
      payload: {
        address: '0x0000000000000000000000000000000000000002',
        signature: '0xsignature',
      },
    });
    await expect(
      keyring.signTypedData(address, data, { version: 'V4' })
    ).rejects.toThrow('signature doesnt match');
  });

  it('retains Connect 10 error messages and codes', async () => {
    const bridge = makeBridge();
    bridge.getPublicKey.mockResolvedValue({
      success: false,
      error: { message: 'Device disconnected', code: 'Device_Disconnected' },
    });
    const keyring: any = new TrezorKeyring({ bridge } as any);
    await expect(keyring.unlock()).rejects.toMatchObject({
      message: expect.stringContaining('Device disconnected'),
      code: 'Device_Disconnected',
    });
  });

  it('rejects V3 before making a device call', async () => {
    const bridge = makeBridge();
    const keyring: any = new TrezorKeyring({ bridge } as any);
    await expect(
      keyring.signTypedData(address, {}, { version: 'V3' })
    ).rejects.toThrow('Only version 4');
    expect(bridge.ethereumSignTypedData).not.toHaveBeenCalled();
  });
});
