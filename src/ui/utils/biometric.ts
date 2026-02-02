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

const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const deriveAesKey = async (prfResult: ArrayBuffer) => {
  const raw = new Uint8Array(prfResult);
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

const getPrfResult = async (credentialId: Uint8Array, prfSalt: Uint8Array) => {
  if (!navigator.credentials?.get || !window.PublicKeyCredential) {
    throw new Error('Biometric unlock not supported');
  }

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [
        {
          id: credentialId,
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
      extensions: {
        prf: {
          eval: {
            first: prfSalt,
          },
        },
      } as any,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('Biometric unlock canceled');
  }

  const extResults = assertion.getClientExtensionResults?.() || {};
  const prfResults = (extResults as any)?.prf?.results?.first;

  if (!prfResults) {
    throw new Error('Biometric unlock not supported');
  }

  if (prfResults instanceof ArrayBuffer) {
    return prfResults;
  }

  if (prfResults.buffer) {
    return prfResults.buffer as ArrayBuffer;
  }

  throw new Error('Biometric unlock not supported');
};

export type BiometricUnlockPayload = {
  credentialId: string;
  encryptedPassword: string;
  iv: string;
  prfSalt: string;
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
    throw new Error('Biometric unlock not supported');
  }

  const prfSalt = randomBytes(32);
  const userId = randomBytes(32);
  const challenge = randomBytes(32);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Rabby',
      },
      user: {
        id: userId,
        name: 'Rabby',
        displayName: 'Rabby',
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
        userVerification: 'required',
      },
      extensions: {
        prf: {
          eval: {
            first: prfSalt,
          },
        },
      } as any,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Biometric unlock canceled');
  }

  const credentialId = new Uint8Array(credential.rawId);
  const prfResult = await getPrfResult(credentialId, prfSalt);
  const key = await deriveAesKey(prfResult);
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(password)
  );

  return {
    credentialId: toBase64(credentialId.buffer),
    prfSalt: toBase64(prfSalt.buffer),
    iv: toBase64(iv.buffer),
    encryptedPassword: toBase64(encrypted),
  };
};

export const decryptBiometricUnlockPassword = async (
  payload: BiometricUnlockPayload
) => {
  const credentialId = fromBase64(payload.credentialId);
  const prfSalt = fromBase64(payload.prfSalt);
  const prfResult = await getPrfResult(credentialId, prfSalt);
  const key = await deriveAesKey(prfResult);
  const iv = fromBase64(payload.iv);
  const encrypted = fromBase64(payload.encryptedPassword);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  return decoder.decode(decrypted);
};
