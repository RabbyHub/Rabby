/**
 * Biometric unlock v2 key handling.
 *
 * The wallet vault is still encrypted with the user's password. Biometric
 * unlock only wraps that password with a key-encryption key (KEK) that comes
 * from the WebAuthn PRF extension (CTAP `hmac-secret`). The PRF output is
 * computed inside the authenticator from a per-credential secret and is only
 * released after user verification, so unlike `user.id` / `userHandle` it is
 * never readable from the passkey provider's storage or credential listings.
 *
 * Nothing here is persisted in plaintext: the store keeps only the salt fed to
 * the PRF, the AES-GCM IV and the ciphertext.
 */

export const BIOMETRIC_UNLOCK_VERSION = 2 as const;

/** Length of the PRF output (HMAC-SHA-256) and of the salt we feed it. */
export const BIOMETRIC_PRF_LENGTH = 32;

const KEK_INFO = 'rabby-biometric-unlock:v2:kek';
const AAD_PREFIX = 'rabby-biometric-unlock:v2:';
const MAX_CREDENTIAL_ID_LENGTH = 1023;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const getSubtle = () => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto is not available');
  }
  return subtle;
};

export const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

export const base64UrlToBytes = (value: string) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error('Invalid base64url value');
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const decodeFixedLength = (
  value: unknown,
  length: number,
  label: string
) => {
  const bytes = base64UrlToBytes(value as string);
  if (bytes.byteLength !== length) {
    throw new Error(`Invalid ${label}`);
  }
  return bytes;
};

export const assertCredentialId = (value: unknown): string => {
  const bytes = base64UrlToBytes(value as string);
  if (!bytes.byteLength || bytes.byteLength > MAX_CREDENTIAL_ID_LENGTH) {
    throw new Error('Invalid credential id');
  }
  // Re-encode so the stored form is canonical and comparable.
  return bytesToBase64Url(bytes);
};

export const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

const deriveKek = async (prfOutput: Uint8Array, prfSalt: Uint8Array) => {
  if (prfOutput.byteLength !== BIOMETRIC_PRF_LENGTH) {
    throw new Error('Invalid PRF output');
  }
  const subtle = getSubtle();
  const ikm = await subtle.importKey('raw', prfOutput, 'HKDF', false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: prfSalt,
      info: encoder.encode(KEK_INFO),
    },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Binds the ciphertext to the scheme version and the credential that guards
// it, so a record cannot be replayed under another credential or format.
const getAdditionalData = (credentialId: string) =>
  encoder.encode(`${AAD_PREFIX}${credentialId}`);

export const encryptPasswordWithPrf = async ({
  password,
  prfOutput,
  prfSalt,
  credentialId,
}: {
  password: string;
  prfOutput: Uint8Array;
  prfSalt: Uint8Array;
  credentialId: string;
}) => {
  const kek = await deriveKek(prfOutput, prfSalt);
  const iv = randomBytes(12);
  const ciphertext = await getSubtle().encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: getAdditionalData(credentialId),
    },
    kek,
    encoder.encode(password)
  );
  return {
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
  };
};

export const decryptPasswordWithPrf = async ({
  prfOutput,
  prfSalt,
  credentialId,
  iv,
  ciphertext,
}: {
  prfOutput: Uint8Array;
  prfSalt: Uint8Array;
  credentialId: string;
  iv: string;
  ciphertext: string;
}) => {
  const kek = await deriveKek(prfOutput, prfSalt);
  const plaintext = await getSubtle().decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(iv),
      additionalData: getAdditionalData(credentialId),
    },
    kek,
    base64UrlToBytes(ciphertext)
  );
  return decoder.decode(plaintext);
};
