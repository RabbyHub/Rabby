import { createPersistStore } from 'background/utils';
import {
  assertCredentialId,
  BIOMETRIC_PRF_LENGTH,
  BIOMETRIC_UNLOCK_VERSION,
  base64UrlToBytes,
  bytesToBase64Url,
  decodeFixedLength,
  randomBytes,
  decryptPasswordWithPrf,
  encryptPasswordWithPrf,
} from 'background/utils/biometricUnlockCrypto';
import preferenceService from './preference';

const AUTHENTICATOR_TRANSPORTS = [
  'ble',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
];

export type BiometricUnlockRecord = {
  version: typeof BIOMETRIC_UNLOCK_VERSION;
  /** base64url WebAuthn credential id */
  credentialId: string;
  /** base64url salt evaluated by the PRF extension */
  prfSalt: string;
  /** base64url AES-GCM IV */
  iv: string;
  /** base64url AES-GCM ciphertext (with tag) of the wallet password */
  ciphertext: string;
  transports: string[];
  createdAt: number;
};

export type BiometricUnlockStore = {
  record: BiometricUnlockRecord | null;
  /** The user had biometric unlock on before and has to enroll again. */
  needsReenroll: boolean;
  /**
   * Credentials we no longer use. Only a page can talk to WebAuthn, so the UI
   * takes these and asks the passkey provider to forget them, best effort.
   */
  staleCredentialIds: string[];
  /**
   * base64url WebAuthn `user.id`, fixed per install. Not a secret. Reusing it
   * makes a re-enrollment replace the previous passkey in the same provider,
   * and lets `signalAllAcceptedCredentials` prune every credential we don't
   * use any more in one call.
   */
  userId: string;
  /** The provider has not yet been told about the current credential set. */
  credentialSyncPending: boolean;
};

/** What the UI needs to run `navigator.credentials.get`. None of it is secret. */
export type BiometricUnlockRequest = {
  credentialId: string;
  prfSalt: string;
  transports: string[];
};

/** What the UI reports to the passkey provider. None of it is secret. */
export type BiometricCredentialSync = {
  userId: string;
  acceptedCredentialIds: string[];
  staleCredentialIds: string[];
};

export type BiometricUnlockStatus = {
  enabled: boolean;
  needsReenroll: boolean;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isValidRecord = (record: unknown): record is BiometricUnlockRecord => {
  const value = record as BiometricUnlockRecord | null;
  return (
    !!value &&
    value.version === BIOMETRIC_UNLOCK_VERSION &&
    isNonEmptyString(value.credentialId) &&
    isNonEmptyString(value.prfSalt) &&
    isNonEmptyString(value.iv) &&
    isNonEmptyString(value.ciphertext)
  );
};

const sanitizeTransports = (transports: unknown) =>
  Array.isArray(transports)
    ? transports.filter(
        (item): item is string =>
          typeof item === 'string' && AUTHENTICATOR_TRANSPORTS.includes(item)
      )
    : [];

class BiometricUnlockService {
  store!: BiometricUnlockStore;

  init = async () => {
    this.store = await createPersistStore<BiometricUnlockStore>({
      name: 'biometricUnlock',
      template: {
        record: null,
        needsReenroll: false,
        staleCredentialIds: [],
        userId: '',
        credentialSyncPending: false,
      },
      // Keep everything in the background. The UI reads the status through
      // the wallet controller and never needs the ciphertext.
      broadcastKeys: [],
    });

    if (this.store.record && !isValidRecord(this.store.record)) {
      this.store.record = null;
    }
    if (!Array.isArray(this.store.staleCredentialIds)) {
      this.store.staleCredentialIds = [];
    }
    if (!isNonEmptyString(this.store.userId)) {
      this.store.userId = bytesToBase64Url(randomBytes(16));
    }

    this.migrateLegacyRecord();
    this.syncPreference();
  };

  /**
   * v1 wrapped the password with a key derived from the passkey's
   * `userHandle`, which is not a secret: passkey providers return it without
   * user verification and some store it in plaintext. That ciphertext is as
   * good as the password, so it is wiped on upgrade instead of migrated, and
   * the user enrolls again.
   */
  private migrateLegacyRecord = () => {
    const preference = preferenceService.store;
    const legacyCredentialId = preference.biometricUnlockCredentialId;
    const hasLegacyData =
      !!legacyCredentialId ||
      !!preference.biometricUnlockEncryptedPassword ||
      !!preference.biometricUnlockIv;

    if (!hasLegacyData) return;

    const wasEnabled = !!preference.biometricUnlockEnabled;
    preferenceService.clearBiometricUnlockStorage();

    if (legacyCredentialId) {
      this.addStaleCredential(legacyCredentialId);
    }
    if (wasEnabled && !this.store.record) {
      this.store.needsReenroll = true;
    }
  };

  /** `preference.biometricUnlockEnabled` mirrors the record for the UI. */
  private syncPreference = () => {
    const enabled = !!this.store.record;
    if (preferenceService.store.biometricUnlockEnabled !== enabled) {
      preferenceService.setPreferencePartials({
        biometricUnlockEnabled: enabled,
      });
    }
  };

  private addStaleCredential = (credentialId: string) => {
    if (!credentialId) return;
    const ids = this.store.staleCredentialIds || [];
    if (!ids.includes(credentialId)) {
      this.store.staleCredentialIds = [...ids, credentialId].slice(-20);
    }
    this.store.credentialSyncPending = true;
  };

  isEnabled = () => !!this.store?.record;

  getStatus = (): BiometricUnlockStatus => ({
    enabled: this.isEnabled(),
    needsReenroll: !!this.store?.needsReenroll,
  });

  /** Options for `navigator.credentials.create` that the background owns. */
  getEnrollmentOptions = () => ({ userId: this.store.userId });

  getRequest = (): BiometricUnlockRequest | null => {
    const record = this.store?.record;
    if (!record) return null;
    return {
      credentialId: record.credentialId,
      prfSalt: record.prfSalt,
      transports: record.transports || [],
    };
  };

  /**
   * Wrap `password` (already verified by the caller) with the PRF output of a
   * freshly created credential. Replaces any previous record.
   */
  enroll = async (params: {
    password: string;
    credentialId: string;
    prfSalt: string;
    prfOutput: string;
    transports?: string[];
  }) => {
    if (!isNonEmptyString(params.password)) {
      throw new Error('Password required');
    }
    const credentialId = assertCredentialId(params.credentialId);
    const prfSalt = decodeFixedLength(
      params.prfSalt,
      BIOMETRIC_PRF_LENGTH,
      'PRF salt'
    );
    const prfOutput = decodeFixedLength(
      params.prfOutput,
      BIOMETRIC_PRF_LENGTH,
      'PRF output'
    );

    const { iv, ciphertext } = await encryptPasswordWithPrf({
      password: params.password,
      prfOutput,
      prfSalt,
      credentialId,
    });
    prfOutput.fill(0);

    const previous = this.store.record;
    if (previous && previous.credentialId !== credentialId) {
      this.addStaleCredential(previous.credentialId);
    }

    this.store.record = {
      version: BIOMETRIC_UNLOCK_VERSION,
      credentialId,
      prfSalt: bytesToBase64Url(prfSalt),
      iv,
      ciphertext,
      transports: sanitizeTransports(params.transports),
      createdAt: Date.now(),
    };
    this.store.needsReenroll = false;
    this.store.credentialSyncPending = true;
    this.syncPreference();
  };

  /**
   * Returns the wallet password. Throws (fails closed) when there is no
   * record, the credential differs, or the PRF output is wrong.
   */
  decryptPassword = async (params: {
    credentialId: string;
    prfOutput: string;
  }) => {
    const record = this.store.record;
    if (!record) {
      throw new Error('Biometric unlock is not enabled');
    }
    if (assertCredentialId(params.credentialId) !== record.credentialId) {
      throw new Error('Biometric unlock credential mismatch');
    }
    const prfOutput = decodeFixedLength(
      params.prfOutput,
      BIOMETRIC_PRF_LENGTH,
      'PRF output'
    );
    try {
      return await decryptPasswordWithPrf({
        prfOutput,
        prfSalt: base64UrlToBytes(record.prfSalt),
        credentialId: record.credentialId,
        iv: record.iv,
        ciphertext: record.ciphertext,
      });
    } catch {
      throw new Error('Biometric unlock failed');
    } finally {
      prfOutput.fill(0);
    }
  };

  /**
   * Drop the record. The credential is queued for cleanup so the passkey does
   * not linger in the provider. `needsReenroll` tells the UI the user did not
   * turn it off themselves.
   */
  clear = (options?: { needsReenroll?: boolean }) => {
    const record = this.store?.record;
    if (record) {
      this.addStaleCredential(record.credentialId);
      this.store.record = null;
    }
    if (this.store) {
      this.store.needsReenroll = !!options?.needsReenroll && !!record;
    }
    this.syncPreference();
  };

  /**
   * Hand the UI what it should report to the passkey provider, once. Returns
   * null when nothing changed since the last report.
   */
  takeCredentialSync = (): BiometricCredentialSync | null => {
    if (!this.store?.credentialSyncPending) return null;
    const staleCredentialIds = [...(this.store.staleCredentialIds || [])];
    this.store.staleCredentialIds = [];
    this.store.credentialSyncPending = false;
    return {
      userId: this.store.userId,
      acceptedCredentialIds: this.store.record
        ? [this.store.record.credentialId]
        : [],
      staleCredentialIds,
    };
  };

  dismissReenrollNotice = () => {
    if (this.store?.needsReenroll) {
      this.store.needsReenroll = false;
    }
  };
}

export default new BiometricUnlockService();
