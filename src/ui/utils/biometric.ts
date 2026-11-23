/**
 * WebAuthn side of biometric unlock (v2).
 *
 * The page creates/asserts a passkey with the PRF extension and hands only
 * the PRF output to the background, which derives the key-encryption key and
 * wraps/unwraps the wallet password there. The page never sees the stored
 * ciphertext, and on unlock never sees the password.
 *
 * Only an authenticator that returns a PRF output is accepted. There is no
 * fallback to `userHandle` or any other value the passkey provider can hand
 * out without user verification.
 */

const PRF_LENGTH = 32;
const AUTHENTICATOR_DATA_FLAGS_OFFSET = 32;
const FLAG_USER_PRESENT = 0x01;
const FLAG_USER_VERIFIED = 0x04;

export type BiometricUnlockErrorCode = 'unsupported' | 'canceled' | 'failed';

export class BiometricUnlockError extends Error {
  constructor(readonly code: BiometricUnlockErrorCode, message?: string) {
    super(message || `Biometric unlock ${code}`);
    this.name = 'BiometricUnlockError';
  }
}

const BIOMETRIC_CANCEL_KEYWORDS = [
  'cancel',
  'canceled',
  'cancelled',
  'notallowederror',
  'not allowed',
  'aborterror',
  'aborted',
];

export const isBiometricUserCanceledError = (error: unknown) => {
  if (error instanceof BiometricUnlockError) {
    return error.code === 'canceled';
  }
  const errorName = String((error as any)?.name || '').toLowerCase();
  const errorMessage = String((error as any)?.message || '').toLowerCase();

  return BIOMETRIC_CANCEL_KEYWORDS.some(
    (keyword) => errorName.includes(keyword) || errorMessage.includes(keyword)
  );
};

export const isBiometricUnsupportedError = (error: unknown) =>
  error instanceof BiometricUnlockError && error.code === 'unsupported';

const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const base64UrlToBytes = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/** Accepts base64url and the standard base64 the v1 records used. */
const toBase64Url = (value: string) =>
  value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const equalBytes = (left: Uint8Array, right: Uint8Array) => {
  if (left.byteLength !== right.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < left.byteLength; i += 1) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
};

type PrfClientOutputs = {
  prf?: {
    enabled?: boolean;
    results?: { first?: ArrayBuffer | ArrayBufferView };
  };
};

const toBytes = (value?: ArrayBuffer | ArrayBufferView) => {
  if (!value) return undefined;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
};

const getPrfOutputs = (credential: PublicKeyCredential) => {
  try {
    return (credential.getClientExtensionResults() as PrfClientOutputs).prf;
  } catch {
    return undefined;
  }
};

const assertUserVerified = (authenticatorData?: ArrayBuffer | null) => {
  // Not exposed on old browsers for attestation responses; PRF results are
  // still UV-bound there, so a missing value is not treated as a failure.
  if (!authenticatorData) return;
  const bytes = new Uint8Array(authenticatorData);
  const flags = bytes[AUTHENTICATOR_DATA_FLAGS_OFFSET];
  if (
    flags === undefined ||
    !(flags & FLAG_USER_PRESENT) ||
    !(flags & FLAG_USER_VERIFIED)
  ) {
    throw new BiometricUnlockError('failed', 'User verification failed');
  }
};

const ensureWebAuthn = () => {
  if (
    !window.PublicKeyCredential ||
    !navigator.credentials?.create ||
    !navigator.credentials?.get
  ) {
    throw new BiometricUnlockError('unsupported');
  }
};

const normalizeWebAuthnError = (error: unknown): never => {
  if (error instanceof BiometricUnlockError) throw error;
  const name = String((error as any)?.name || '');
  // NotAllowedError covers user cancel, timeout and a dismissed sheet; none
  // of them deserve an error toast.
  if (name === 'NotAllowedError' || name === 'AbortError') {
    throw new BiometricUnlockError('canceled');
  }
  if (name === 'NotSupportedError') {
    throw new BiometricUnlockError('unsupported');
  }
  throw new BiometricUnlockError(
    'failed',
    (error as any)?.message || 'Biometric unlock failed'
  );
};

const getBiometricRpId = () => window.location.hostname;

export const cleanupBiometricCredential = async (credentialId: string) => {
  if (!credentialId || !window.PublicKeyCredential) {
    return false;
  }

  const publicKeyCredentialCtor = PublicKeyCredential as typeof PublicKeyCredential & {
    signalUnknownCredential?: (options: {
      rpId: string;
      credentialId: string;
    }) => Promise<void>;
  };

  if (typeof publicKeyCredentialCtor.signalUnknownCredential !== 'function') {
    return false;
  }

  try {
    await publicKeyCredentialCtor.signalUnknownCredential({
      rpId: getBiometricRpId(),
      credentialId: toBase64Url(credentialId),
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export type BiometricCredentialSync = {
  userId: string;
  acceptedCredentialIds: string[];
  staleCredentialIds: string[];
};

/**
 * Tell the passkey provider which credentials are still in use, so the ones
 * we dropped (disabled, replaced, failed enrollments, v1) disappear from the
 * user's password manager. Best effort: providers may not implement the
 * signal API or may ignore it.
 *
 * `signalAllAcceptedCredentials` covers every credential created under our
 * fixed user.id; `signalUnknownCredential` covers the rest (v1 used a random
 * user.id per enrollment) and providers that only implement the latter.
 */
export const reportBiometricCredentials = async (
  sync: BiometricCredentialSync | null
) => {
  if (!sync || !window.PublicKeyCredential) return;

  const ctor = PublicKeyCredential as typeof PublicKeyCredential & {
    signalAllAcceptedCredentials?: (options: {
      rpId: string;
      userId: string;
      allAcceptedCredentialIds: string[];
    }) => Promise<void>;
  };

  if (sync.userId && typeof ctor.signalAllAcceptedCredentials === 'function') {
    try {
      await ctor.signalAllAcceptedCredentials({
        rpId: getBiometricRpId(),
        userId: sync.userId,
        allAcceptedCredentialIds: sync.acceptedCredentialIds.map(toBase64Url),
      });
    } catch (e) {
      console.error(e);
    }
  }

  const accepted = new Set(sync.acceptedCredentialIds.map(toBase64Url));
  await Promise.all(
    sync.staleCredentialIds
      .filter((id) => !accepted.has(toBase64Url(id)))
      .map((id) => cleanupBiometricCredential(id))
  );
};

export const syncBiometricCredentials = async (wallet: {
  takeBiometricCredentialSync: () => Promise<BiometricCredentialSync | null>;
}) => {
  try {
    await reportBiometricCredentials(
      await wallet.takeBiometricCredentialSync()
    );
  } catch (e) {
    console.error('[biometric] credential sync failed', e);
  }
};

export const isBiometricUnlockSupported = async () => {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return false;
  }

  if (
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !==
    'function'
  ) {
    return false;
  }

  try {
    if (
      !(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    ) {
      return false;
    }
  } catch {
    return false;
  }

  // Only a hint: a browser that knows PRF may still meet an authenticator
  // that doesn't. Enrollment makes the final call by requiring a PRF output.
  const ctor = PublicKeyCredential as typeof PublicKeyCredential & {
    getClientCapabilities?: () => Promise<Record<string, boolean>>;
  };
  if (typeof ctor.getClientCapabilities === 'function') {
    try {
      const capabilities = await ctor.getClientCapabilities();
      if (capabilities?.['extension:prf'] === false) {
        return false;
      }
    } catch {
      // ignore
    }
  }

  return true;
};

export type BiometricAssertionRequest = {
  credentialId: string;
  prfSalt: string;
  transports?: string[];
};

/**
 * Run a user-verified assertion and return the PRF output (base64url).
 * Throws when the authenticator returns no PRF output: there is nothing else
 * we accept.
 */
export const getBiometricPrfOutput = async (
  request: BiometricAssertionRequest
) => {
  ensureWebAuthn();
  const expectedCredentialId = base64UrlToBytes(request.credentialId);
  const prfSalt = base64UrlToBytes(request.prfSalt);

  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [
          {
            type: 'public-key',
            id: expectedCredentialId,
            transports: request.transports?.length
              ? (request.transports as AuthenticatorTransport[])
              : undefined,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
        extensions: {
          prf: { eval: { first: prfSalt } },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (error) {
    return normalizeWebAuthnError(error);
  }

  if (!assertion) {
    throw new BiometricUnlockError('canceled');
  }
  if (!(assertion.response instanceof AuthenticatorAssertionResponse)) {
    throw new BiometricUnlockError('failed');
  }
  if (!equalBytes(new Uint8Array(assertion.rawId), expectedCredentialId)) {
    throw new BiometricUnlockError('failed', 'Credential mismatch');
  }
  assertUserVerified(assertion.response.authenticatorData);

  const prfOutput = toBytes(getPrfOutputs(assertion)?.results?.first);
  if (!prfOutput || prfOutput.byteLength !== PRF_LENGTH) {
    throw new BiometricUnlockError('unsupported');
  }

  const encoded = bytesToBase64Url(prfOutput);
  prfOutput.fill(0);
  return encoded;
};

export type BiometricEnrollment = {
  credentialId: string;
  prfSalt: string;
  prfOutput: string;
  transports: string[];
};

/**
 * Create a platform passkey with PRF and return what the background needs to
 * wrap the password. A credential that turns out to lack PRF is signalled for
 * deletion and enrollment fails.
 */
export const createBiometricEnrollment = async ({
  userId,
}: {
  /** base64url, fixed per install (see the background store). */
  userId: string;
}): Promise<BiometricEnrollment> => {
  ensureWebAuthn();
  if (!userId) {
    throw new BiometricUnlockError('failed', 'Missing user id');
  }
  const prfSalt = randomBytes(PRF_LENGTH);

  const publicKey = {
    challenge: randomBytes(32),
    rp: { name: 'Rabby Wallet' },
    user: {
      // Not a secret. Fixed per install: a re-enrollment replaces the earlier
      // passkey in the same provider instead of piling up next to it.
      id: base64UrlToBytes(userId),
      name: 'Rabby Wallet',
      displayName: 'Rabby Wallet',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      requireResidentKey: false,
      userVerification: 'required',
    },
    hints: ['client-device'],
    extensions: {
      prf: { eval: { first: prfSalt } },
    },
  } as PublicKeyCredentialCreationOptions;

  let credential: PublicKeyCredential | null;
  try {
    credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential | null;
  } catch (error) {
    return normalizeWebAuthnError(error);
  }

  if (!credential) {
    throw new BiometricUnlockError('canceled');
  }
  if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new BiometricUnlockError('failed');
  }

  const credentialId = bytesToBase64Url(new Uint8Array(credential.rawId));
  const response = credential.response as AuthenticatorAttestationResponse & {
    getAuthenticatorData?: () => ArrayBuffer;
    getTransports?: () => string[];
  };
  const transports = (() => {
    try {
      return response.getTransports?.() || [];
    } catch {
      return [];
    }
  })();

  try {
    assertUserVerified(response.getAuthenticatorData?.());

    const prf = getPrfOutputs(credential);
    if (!prf || prf.enabled === false) {
      throw new BiometricUnlockError('unsupported');
    }

    const encodedSalt = bytesToBase64Url(prfSalt);
    const prfOutput = toBytes(prf.results?.first);
    if (prfOutput && prfOutput.byteLength === PRF_LENGTH) {
      const encoded = bytesToBase64Url(prfOutput);
      prfOutput.fill(0);
      return {
        credentialId,
        prfSalt: encodedSalt,
        prfOutput: encoded,
        transports,
      };
    }

    // Many authenticators only evaluate PRF on get(). That costs the user a
    // second prompt, once.
    return {
      credentialId,
      prfSalt: encodedSalt,
      prfOutput: await getBiometricPrfOutput({
        credentialId,
        prfSalt: encodedSalt,
        transports,
      }),
      transports,
    };
  } catch (error) {
    await cleanupBiometricCredential(credentialId);
    throw error;
  }
};
