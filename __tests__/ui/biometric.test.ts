import {
  BiometricUnlockError,
  createBiometricEnrollment,
  getBiometricPrfOutput,
  isBiometricUnlockSupported,
  isBiometricUnsupportedError,
  isBiometricUserCanceledError,
  reportBiometricCredentials,
  syncBiometricCredentials,
} from '@/ui/utils/biometric';

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
const fill = (value: number, length = 32) => new Uint8Array(length).fill(value);
const authData = (flags: number) => {
  const bytes = new Uint8Array(37);
  bytes[32] = flags;
  return bytes.buffer;
};

class FakeAssertionResponse {
  constructor(readonly authenticatorData: ArrayBuffer) {}
}

class FakeAttestationResponse {
  constructor(
    private readonly authenticatorData: ArrayBuffer,
    private readonly transports: string[] = ['internal']
  ) {}
  getAuthenticatorData() {
    return this.authenticatorData;
  }
  getTransports() {
    return this.transports;
  }
}

const makeCredential = ({
  rawId = fill(7, 16),
  response,
  extensions = {},
}: {
  rawId?: Uint8Array;
  response: unknown;
  extensions?: unknown;
}) => ({
  rawId: rawId.buffer.slice(0),
  response,
  getClientExtensionResults: () => extensions,
});

const credentialId = b64url(fill(7, 16));
const prfSalt = b64url(fill(1));
const prfOutput = fill(2);

let PKC: Record<string, jest.Mock | undefined>;
let credentials: { create: jest.Mock; get: jest.Mock };

beforeEach(() => {
  if (!globalThis.crypto?.getRandomValues) {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      value: require('crypto').webcrypto,
    });
  }
  PKC = {
    isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(async () => true),
    getClientCapabilities: undefined,
    signalUnknownCredential: jest.fn(async () => undefined),
    signalAllAcceptedCredentials: jest.fn(async () => undefined),
  };
  credentials = { create: jest.fn(), get: jest.fn() };
  Object.assign(window as any, {
    PublicKeyCredential: PKC,
    AuthenticatorAssertionResponse: FakeAssertionResponse,
    AuthenticatorAttestationResponse: FakeAttestationResponse,
  });
  Object.defineProperty(window.navigator, 'credentials', {
    configurable: true,
    value: credentials,
  });
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const assertionWith = (overrides: {
  flags?: number;
  rawId?: Uint8Array;
  extensions?: unknown;
}) =>
  makeCredential({
    rawId: overrides.rawId,
    response: new FakeAssertionResponse(
      authData(overrides.flags ?? FLAG_UP | FLAG_UV)
    ),
    extensions: overrides.extensions ?? {
      prf: { results: { first: prfOutput.slice().buffer } },
    },
  });

describe('isBiometricUnlockSupported', () => {
  test('needs a user-verifying platform authenticator', async () => {
    await expect(isBiometricUnlockSupported()).resolves.toBe(true);

    PKC.isUserVerifyingPlatformAuthenticatorAvailable!.mockResolvedValue(false);
    await expect(isBiometricUnlockSupported()).resolves.toBe(false);
  });

  test('trusts a browser that says it lacks PRF', async () => {
    PKC.getClientCapabilities = jest.fn(async () => ({
      'extension:prf': false,
    }));
    await expect(isBiometricUnlockSupported()).resolves.toBe(false);
  });

  test('is false without WebAuthn', async () => {
    delete (window as any).PublicKeyCredential;
    await expect(isBiometricUnlockSupported()).resolves.toBe(false);
  });
});

describe('getBiometricPrfOutput', () => {
  test('requires UV, evaluates the stored salt and returns the PRF output', async () => {
    credentials.get.mockResolvedValue(assertionWith({}));

    await expect(
      getBiometricPrfOutput({ credentialId, prfSalt, transports: ['internal'] })
    ).resolves.toBe(b64url(prfOutput));

    const { publicKey } = credentials.get.mock.calls[0][0];
    expect(publicKey.userVerification).toBe('required');
    expect(publicKey.allowCredentials).toEqual([
      { type: 'public-key', id: fill(7, 16), transports: ['internal'] },
    ]);
    expect(publicKey.extensions.prf.eval.first).toEqual(fill(1));
  });

  test('never falls back when the authenticator returns no PRF output', async () => {
    credentials.get.mockResolvedValue(assertionWith({ extensions: {} }));
    const error = await getBiometricPrfOutput({ credentialId, prfSalt }).catch(
      (e) => e
    );
    expect(isBiometricUnsupportedError(error)).toBe(true);
  });

  test('rejects an assertion without user verification', async () => {
    credentials.get.mockResolvedValue(assertionWith({ flags: FLAG_UP }));
    await expect(
      getBiometricPrfOutput({ credentialId, prfSalt })
    ).rejects.toThrow('User verification failed');
  });

  test('rejects an assertion from another credential', async () => {
    credentials.get.mockResolvedValue(assertionWith({ rawId: fill(9, 16) }));
    await expect(
      getBiometricPrfOutput({ credentialId, prfSalt })
    ).rejects.toThrow('Credential mismatch');
  });

  test('maps a dismissed prompt to a silent cancel', async () => {
    credentials.get.mockRejectedValue(
      Object.assign(new Error('The operation either timed out'), {
        name: 'NotAllowedError',
      })
    );
    const error = await getBiometricPrfOutput({ credentialId, prfSalt }).catch(
      (e) => e
    );
    expect(error).toBeInstanceOf(BiometricUnlockError);
    expect(isBiometricUserCanceledError(error)).toBe(true);
  });
});

describe('createBiometricEnrollment', () => {
  const userId = b64url(fill(5, 16));

  const attestationWith = (extensions: unknown, flags = FLAG_UP | FLAG_UV) =>
    makeCredential({
      response: new FakeAttestationResponse(authData(flags)),
      extensions,
    });

  test('creates a UV-required platform passkey under the fixed user id', async () => {
    credentials.create.mockResolvedValue(
      attestationWith({
        prf: { enabled: true, results: { first: prfOutput.slice().buffer } },
      })
    );

    const enrollment = await createBiometricEnrollment({ userId });

    expect(enrollment).toMatchObject({
      credentialId,
      prfOutput: b64url(prfOutput),
      transports: ['internal'],
    });
    const { publicKey } = credentials.create.mock.calls[0][0];
    expect(publicKey.user.id).toEqual(fill(5, 16));
    expect(publicKey.authenticatorSelection).toMatchObject({
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    });
    // The salt the PRF was evaluated with is the one handed back.
    expect(b64url(publicKey.extensions.prf.eval.first)).toBe(
      enrollment.prfSalt
    );
    expect(credentials.get).not.toHaveBeenCalled();
  });

  test('runs one assertion when PRF is only evaluated on get()', async () => {
    credentials.create.mockResolvedValue(
      attestationWith({ prf: { enabled: true } })
    );
    credentials.get.mockResolvedValue(assertionWith({}));

    const enrollment = await createBiometricEnrollment({ userId });

    expect(enrollment.prfOutput).toBe(b64url(prfOutput));
    const { publicKey } = credentials.get.mock.calls[0][0];
    expect(b64url(publicKey.extensions.prf.eval.first)).toBe(
      enrollment.prfSalt
    );
  });

  test('refuses an authenticator without PRF and drops the new passkey', async () => {
    credentials.create.mockResolvedValue(
      attestationWith({ prf: { enabled: false } })
    );

    const error = await createBiometricEnrollment({ userId }).catch((e) => e);

    expect(isBiometricUnsupportedError(error)).toBe(true);
    expect(PKC.signalUnknownCredential).toHaveBeenCalledWith({
      rpId: window.location.hostname,
      credentialId,
    });
  });

  test('refuses a browser that does not know PRF at all', async () => {
    credentials.create.mockResolvedValue(attestationWith({}));
    const error = await createBiometricEnrollment({ userId }).catch((e) => e);
    expect(isBiometricUnsupportedError(error)).toBe(true);
  });

  test('refuses a credential created without user verification', async () => {
    credentials.create.mockResolvedValue(
      attestationWith(
        {
          prf: { enabled: true, results: { first: prfOutput.slice().buffer } },
        },
        FLAG_UP
      )
    );
    await expect(createBiometricEnrollment({ userId })).rejects.toThrow(
      'User verification failed'
    );
    expect(PKC.signalUnknownCredential).toHaveBeenCalled();
  });
});

describe('credential sync', () => {
  const sync = {
    userId: 'dXNlcg',
    acceptedCredentialIds: ['current'],
    staleCredentialIds: ['b2xk+/==', 'current'],
  };

  test('reports the accepted set and signals each stale credential', async () => {
    await reportBiometricCredentials(sync);

    expect(PKC.signalAllAcceptedCredentials).toHaveBeenCalledWith({
      rpId: window.location.hostname,
      userId: 'dXNlcg',
      allAcceptedCredentialIds: ['current'],
    });
    // v1 ids were standard base64; the accepted one is never signalled.
    expect(PKC.signalUnknownCredential).toHaveBeenCalledTimes(1);
    expect(PKC.signalUnknownCredential).toHaveBeenCalledWith({
      rpId: window.location.hostname,
      credentialId: 'b2xk-_',
    });
  });

  test('still signals stale ids when signalAllAcceptedCredentials is missing or throws', async () => {
    PKC.signalAllAcceptedCredentials = jest.fn(async () => {
      throw new Error('nope');
    });
    await reportBiometricCredentials(sync);
    expect(PKC.signalUnknownCredential).toHaveBeenCalledTimes(1);

    PKC.signalAllAcceptedCredentials = undefined;
    await reportBiometricCredentials(sync);
    expect(PKC.signalUnknownCredential).toHaveBeenCalledTimes(2);
  });

  test('does nothing when the background has nothing to report', async () => {
    const wallet = { takeBiometricCredentialSync: jest.fn(async () => null) };
    await syncBiometricCredentials(wallet);
    expect(wallet.takeBiometricCredentialSync).toHaveBeenCalledTimes(1);
    expect(PKC.signalAllAcceptedCredentials).not.toHaveBeenCalled();
    expect(PKC.signalUnknownCredential).not.toHaveBeenCalled();
  });
});
