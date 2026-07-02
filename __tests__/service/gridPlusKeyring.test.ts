jest.mock('@/utils/env', () => ({
  isManifestV3: true,
}));

jest.mock('webextension-polyfill', () => ({
  runtime: {
    sendMessage: jest.fn(),
  },
}));

jest.mock('@/constant', () => ({
  EVENTS: {},
}));

jest.mock('@/background/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));

import LatticeKeyring from 'background/service/keyring/eth-lattice-keyring/eth-lattice-keyring';

describe('GridPlus LatticeKeyring', () => {
  const parentPrototype = Object.getPrototypeOf(LatticeKeyring.prototype);
  const parentUnlock = parentPrototype.unlock;

  afterEach(() => {
    parentPrototype.unlock = parentUnlock;
  });

  it('clears cached pairing creds and retries unlock once', async () => {
    const keyring = new (LatticeKeyring as any)({
      appName: 'Rabby',
      creds: {
        deviceID: 'old-device',
        password: 'old-password',
        endpoint: 'https://old.endpoint',
      },
    });
    const devicesSeen: unknown[] = [];

    parentPrototype.unlock = jest.fn(function (this: any) {
      devicesSeen.push(this.creds.deviceID);

      if (devicesSeen.length === 1) {
        return Promise.reject(new Error('stale pairing'));
      }

      return Promise.resolve('Unlocked');
    });

    await expect(keyring.unlock()).resolves.toBe('Unlocked');

    expect(parentPrototype.unlock).toHaveBeenCalledTimes(2);
    expect(devicesSeen).toEqual(['old-device', null]);
    expect(keyring.accounts).toEqual([]);
  });

  it('does not retry when there are no cached pairing creds', async () => {
    const keyring = new (LatticeKeyring as any)({ appName: 'Rabby' });

    parentPrototype.unlock = jest.fn(() =>
      Promise.reject(new Error('connector closed'))
    );

    await expect(keyring.unlock()).rejects.toThrow('connector closed');

    expect(parentPrototype.unlock).toHaveBeenCalledTimes(1);
  });

  it('restores cached creds when retrying with fresh pairing fails', async () => {
    const oldCreds = {
      deviceID: 'old-device',
      password: 'old-password',
      endpoint: 'https://old.endpoint',
    };
    const keyring = new (LatticeKeyring as any)({
      appName: 'Rabby',
      creds: oldCreds,
    });

    parentPrototype.unlock = jest.fn(() => Promise.reject(new Error('failed')));

    await expect(keyring.unlock()).rejects.toThrow('failed');

    expect(parentPrototype.unlock).toHaveBeenCalledTimes(2);
    expect(keyring.creds).toEqual(oldCreds);
  });
});
