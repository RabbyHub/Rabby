import { isManifestV3 } from '@/utils/env';
import {
  encryptWithDetail,
  decryptWithDetail,
  importKey,
  decryptWithKey,
  encryptWithKey,
} from '@metamask/browser-passworder';
import { isNil } from 'lodash';
import Browser from 'webextension-polyfill';

export type PersistType = 'perps' | 'keyring';

// Lock invalidates in-flight crypto and waits for session writes before removal.
let sessionKeyGeneration = 0;
const pendingSessionWrites = new Set<Promise<void>>();

/**
 * Get session storage keys for a persist type
 */
const getSessionKeys = async (persistType: PersistType = 'keyring') => {
  if (persistType === 'perps') {
    const { perpsVault } = await Browser.storage.session.get('perpsVault');
    return {
      exportedKey: perpsVault?.exportedKey,
      salt: perpsVault?.salt,
    };
  }

  const { exportedKey, salt } = await Browser.storage.session.get([
    'exportedKey',
    'salt',
  ]);
  return { exportedKey, salt };
};

/**
 * Set session storage keys for a persist type
 */
const setSessionKeys = async (
  exportedKeyString: string,
  salt: string,
  persistType: PersistType,
  generation: number
) => {
  if (generation !== sessionKeyGeneration) {
    throw new Error('Wallet is locked');
  }
  const write = Browser.storage.session.set(
    persistType === 'perps'
      ? {
          perpsVault: {
            exportedKey: exportedKeyString,
            salt,
          },
        }
      : { exportedKey: exportedKeyString, salt }
  );
  pendingSessionWrites.add(write);
  try {
    await write;
    if (generation !== sessionKeyGeneration) {
      throw new Error('Wallet is locked');
    }
  } finally {
    pendingSessionWrites.delete(write);
  }
};

/**
 * Encrypt data with password
 * @param param
 * @param param.data data to be encrypted
 * @param param.password (Optional) if not provided, will use the password from session
 * @returns
 */
export const passwordEncrypt = async ({
  data,
  password,
  persisted,
  persistType = 'keyring',
}: {
  data: any;
  password?: string | null;
  persisted?: boolean;
  persistType?: PersistType;
}) => {
  const generation = sessionKeyGeneration;
  if (!isNil(password)) {
    const { vault, exportedKeyString } = await encryptWithDetail(
      password,
      data
    );
    const { salt } = JSON.parse(vault) as Awaited<
      ReturnType<typeof decryptWithDetail>
    >;

    if (isManifestV3 && persisted) {
      await setSessionKeys(exportedKeyString, salt, persistType, generation);
    }

    return vault;
  }

  const { exportedKey, salt } = await getSessionKeys(persistType);

  if (!exportedKey || !salt) {
    throw new Error('No exportedKey found in session');
  }

  const key = await importKey(exportedKey);
  const encryptedData = await encryptWithKey(key, data);
  const vault = JSON.stringify({ ...encryptedData, salt });

  return vault;
};

/**
 * Decrypt data with password
 * @param param
 * @param param.encryptedData encrypted data, should be a string
 * @param param.password (Optional) if not provided, will use the password from session
 * @returns
 */
export const passwordDecrypt = async ({
  encryptedData,
  password,
  persisted,
  persistType = 'keyring',
}: {
  encryptedData: string;
  password?: string | null;
  persisted?: boolean;
  persistType?: PersistType;
}) => {
  const generation = sessionKeyGeneration;
  if (!isNil(password)) {
    const { vault, exportedKeyString, salt } = await decryptWithDetail(
      password,
      encryptedData
    );

    if (isManifestV3 && persisted) {
      await setSessionKeys(exportedKeyString, salt, persistType, generation);
    }

    return vault as any;
  }

  if (!isManifestV3) {
    return;
  }

  const { exportedKey, salt } = await getSessionKeys(persistType);

  if (!exportedKey || !salt) {
    throw new Error('No exportedKey found in session');
  }

  const key = await importKey(exportedKey);
  const decryptedData = await decryptWithKey(key, JSON.parse(encryptedData));

  return decryptedData;
};

export const passwordClearKey = async (persistType?: PersistType) => {
  sessionKeyGeneration++;
  if (!isManifestV3) {
    return;
  }

  await Promise.allSettled([...pendingSessionWrites]);

  if (persistType) {
    // Clear specific persist type keys
    if (persistType === 'perps') {
      await Browser.storage.session.remove(['perpsVault']);
    } else {
      await Browser.storage.session.remove(['exportedKey', 'salt']);
    }
  } else {
    // Clear all keys
    await Browser.storage.session.remove(['exportedKey', 'salt', 'perpsVault']);
  }
};
