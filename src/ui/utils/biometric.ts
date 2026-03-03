const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

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
  const errorName = String((error as any)?.name || '').toLowerCase();
  const errorMessage = String((error as any)?.message || '').toLowerCase();

  return BIOMETRIC_CANCEL_KEYWORDS.some(
    (keyword) => errorName.includes(keyword) || errorMessage.includes(keyword)
  );
};

const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const equalBytes = (left: Uint8Array, right: Uint8Array) => {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  for (let i = 0; i < left.byteLength; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
};

const deriveAesKey = async (secret: Uint8Array) => {
  const raw = new Uint8Array(secret);
  if ([16, 24, 32].includes(raw.byteLength)) {
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  const hkdfKey = await crypto.subtle.importKey('raw', raw, 'HKDF', false, [
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: encoder.encode('rabby-biometric-unlock'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const toBase64Url = (value: string) =>
  value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const getBiometricAssertionResult = async (
  expectedCredentialId?: Uint8Array
) => {
  if (!navigator.credentials?.get || !window.PublicKeyCredential) {
    throw new Error('Biometric unlock not supported1');
  }

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: expectedCredentialId
        ? [
            {
              id: expectedCredentialId as BufferSource,
              type: 'public-key',
            },
          ]
        : undefined,
      userVerification: 'required',
      timeout: 60000,
    },
  });

  if (!assertion) {
    throw new Error('Biometric unlock canceled');
  }

  if (!(assertion instanceof PublicKeyCredential)) {
    throw new Error('Biometric unlock not supported2');
  }

  if (!(assertion.response instanceof AuthenticatorAssertionResponse)) {
    throw new Error('Biometric unlock not supported3');
  }

  const { userHandle } = assertion.response;

  if (!userHandle) {
    throw new Error('Biometric unlock not supported4');
  }

  return {
    credentialId: new Uint8Array(assertion.rawId),
    userId: new Uint8Array(userHandle),
  };
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

export type BiometricUnlockPayload = {
  credentialId: string;
  encryptedPassword: string;
  iv: string;
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
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export const createBiometricUnlockPayload = async (
  password: string
): Promise<BiometricUnlockPayload> => {
  if (!password) {
    throw new Error('Password required');
  }

  if (!navigator.credentials?.create || !window.PublicKeyCredential) {
    throw new Error('Biometric unlock not supported5');
  }

  const userId = randomBytes(64);
  const challenge = randomBytes(32);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Rabby Wallet',
      },
      user: {
        id: userId,
        name: 'Rabby Wallet',
        displayName: 'Rabby Wallet',
      },
      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7,
        },
        {
          type: 'public-key',
          alg: -257,
        },
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
      },
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Biometric unlock canceled');
  }

  const credentialId = new Uint8Array(credential.rawId);
  const key = await deriveAesKey(userId);
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(password)
  );

  return {
    credentialId: toBase64(credentialId.buffer),
    iv: toBase64(iv.buffer),
    encryptedPassword: toBase64(encrypted),
  };
};

export const decryptBiometricUnlockPassword = async (
  payload: BiometricUnlockPayload
) => {
  const expectedCredentialId = fromBase64(payload.credentialId);
  const { credentialId, userId } = await getBiometricAssertionResult(
    expectedCredentialId
  );
  if (!equalBytes(credentialId, expectedCredentialId)) {
    throw new Error('Biometric unlock credential mismatch');
  }

  const key = await deriveAesKey(userId);
  const iv = fromBase64(payload.iv);
  const encrypted = fromBase64(payload.encryptedPassword);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return decoder.decode(decrypted);
};
