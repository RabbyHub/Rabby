/**
 * @jest-environment node
 */

const mockPreferenceStore: Record<string, any> = {};

jest.mock('background/utils', () => ({
  createPersistStore: jest.fn(async ({ template }) => ({
    ...template,
    ...(globalThis as any).__biometricPersisted,
  })),
}));

jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: {
    get store() {
      return mockPreferenceStore;
    },
    setPreferencePartials: jest.fn((partials) => {
      Object.assign(mockPreferenceStore, partials);
    }),
    clearBiometricUnlockStorage: jest.fn(() => {
      Object.assign(mockPreferenceStore, {
        biometricUnlockCredentialId: '',
        biometricUnlockEncryptedPassword: '',
        biometricUnlockIv: '',
      });
    }),
  },
}));

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    value: require('crypto').webcrypto,
  });
}

import { bytesToBase64Url } from '@/background/utils/biometricUnlockCrypto';

const b64 = (bytes: Uint8Array) => bytesToBase64Url(bytes);
const fill = (value: number, length = 32) => new Uint8Array(length).fill(value);

const loadService = async (persisted: Record<string, unknown> = {}) => {
  (globalThis as any).__biometricPersisted = persisted;
  let service!: typeof import('@/background/service/biometricUnlock').default;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    service = require('@/background/service/biometricUnlock').default;
  });
  await service.init();
  return service;
};

const enrollment = {
  password: 'correct horse battery staple',
  credentialId: b64(fill(7, 16)),
  prfSalt: b64(fill(1)),
  prfOutput: b64(fill(2)),
  transports: ['internal', 'bogus'],
};

describe('biometricUnlockService', () => {
  beforeEach(() => {
    Object.keys(mockPreferenceStore).forEach(
      (key) => delete mockPreferenceStore[key]
    );
  });

  test('wraps the password with the PRF output and unwraps it again', async () => {
    const service = await loadService();
    await service.enroll(enrollment);

    const record = service.store.record!;
    expect(record.version).toBe(2);
    expect(record.transports).toEqual(['internal']);
    expect(JSON.stringify(service.store)).not.toContain(enrollment.password);
    expect(JSON.stringify(service.store)).not.toContain(enrollment.prfOutput);
    expect(mockPreferenceStore.biometricUnlockEnabled).toBe(true);
    expect(service.getRequest()).toEqual({
      credentialId: enrollment.credentialId,
      prfSalt: enrollment.prfSalt,
      transports: ['internal'],
    });

    await expect(
      service.decryptPassword({
        credentialId: enrollment.credentialId,
        prfOutput: enrollment.prfOutput,
      })
    ).resolves.toBe(enrollment.password);
  });

  test('fails closed on a wrong PRF output or another credential', async () => {
    const service = await loadService();
    await service.enroll(enrollment);

    await expect(
      service.decryptPassword({
        credentialId: enrollment.credentialId,
        prfOutput: b64(fill(3)),
      })
    ).rejects.toThrow('Biometric unlock failed');

    await expect(
      service.decryptPassword({
        credentialId: b64(fill(8, 16)),
        prfOutput: enrollment.prfOutput,
      })
    ).rejects.toThrow('credential mismatch');

    // The ciphertext is bound to its credential id.
    service.store.record = {
      ...service.store.record!,
      credentialId: b64(fill(9, 16)),
    };
    await expect(
      service.decryptPassword({
        credentialId: b64(fill(9, 16)),
        prfOutput: enrollment.prfOutput,
      })
    ).rejects.toThrow('Biometric unlock failed');
  });

  test('rejects malformed PRF values', async () => {
    const service = await loadService();
    await expect(
      service.enroll({ ...enrollment, prfOutput: b64(fill(2, 16)) })
    ).rejects.toThrow('Invalid PRF output');
    await expect(
      service.enroll({ ...enrollment, prfSalt: 'not base64!' })
    ).rejects.toThrow();
    expect(service.store.record).toBeNull();
  });

  test('wipes v1 userHandle records on upgrade and asks to re-enroll', async () => {
    Object.assign(mockPreferenceStore, {
      biometricUnlockEnabled: true,
      biometricUnlockCredentialId: 'bGVnYWN5+/==',
      biometricUnlockEncryptedPassword: 'cipher',
      biometricUnlockIv: 'iv',
    });

    const service = await loadService();

    expect(mockPreferenceStore).toMatchObject({
      biometricUnlockEnabled: false,
      biometricUnlockCredentialId: '',
      biometricUnlockEncryptedPassword: '',
      biometricUnlockIv: '',
    });
    expect(service.getStatus()).toEqual({
      enabled: false,
      needsReenroll: true,
    });
    expect(service.takeCredentialSync()).toEqual({
      userId: service.store.userId,
      acceptedCredentialIds: [],
      staleCredentialIds: ['bGVnYWN5+/=='],
    });
    expect(service.takeCredentialSync()).toBeNull();
  });

  test('clearing queues the credential for cleanup', async () => {
    const service = await loadService();
    await service.enroll(enrollment);

    service.clear({ needsReenroll: true });

    expect(service.getStatus()).toEqual({
      enabled: false,
      needsReenroll: true,
    });
    expect(mockPreferenceStore.biometricUnlockEnabled).toBe(false);
    expect(service.takeCredentialSync()).toEqual({
      userId: service.store.userId,
      acceptedCredentialIds: [],
      staleCredentialIds: [enrollment.credentialId],
    });
    await expect(
      service.decryptPassword({
        credentialId: enrollment.credentialId,
        prfOutput: enrollment.prfOutput,
      })
    ).rejects.toThrow('not enabled');
  });

  test('drops a persisted record it cannot understand', async () => {
    const service = await loadService({
      record: { version: 1, credentialId: 'x' },
    });
    expect(service.store.record).toBeNull();
    expect(service.isEnabled()).toBe(false);
  });

  test('keeps one user id per install and reports the accepted credential', async () => {
    const service = await loadService();
    const { userId } = service.getEnrollmentOptions();
    expect(userId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(service.takeCredentialSync()).toBeNull();

    await service.enroll(enrollment);
    const replacement = { ...enrollment, credentialId: b64(fill(8, 16)) };
    await service.enroll(replacement);

    expect(service.getEnrollmentOptions().userId).toBe(userId);
    expect(service.takeCredentialSync()).toEqual({
      userId,
      acceptedCredentialIds: [replacement.credentialId],
      staleCredentialIds: [enrollment.credentialId],
    });
    expect(service.takeCredentialSync()).toBeNull();

    const reloaded = await loadService({ userId });
    expect(reloaded.getEnrollmentOptions().userId).toBe(userId);
  });
});
