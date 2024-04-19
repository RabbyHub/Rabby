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
}: {
  data: any;
  password?: string | null;
}) => {
  if (!isNil(password)) {
    const { vault, exportedKeyString } = await encryptWithDetail(
      password,
      data
    );
    const { salt } = JSON.parse(vault) as Awaited<
      ReturnType<typeof decryptWithDetail>
    >;

    if (isManifestV3) {
      Browser.storage.session.set({ exportedKey: exportedKeyString, salt });
    }

    return vault;
  }

  const { exportedKey, salt } = await Browser.storage.session.get([
    'exportedKey',
    'salt',
  ]);

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
}: {
  encryptedData: string;
  password?: string | null;
}) => {
  if (!isNil(password)) {
    const { vault, exportedKeyString, salt } = await decryptWithDetail(
      password,
      encryptedData
    );

    if (isManifestV3) {
      Browser.storage.session.set({ exportedKey: exportedKeyString, salt });
    }

    return vault;
  }

  if (!isManifestV3) {
    return;
  }

  const { exportedKey, salt } = await Browser.storage.session.get([
    'exportedKey',
    'salt',
  ]);

  if (!exportedKey || !salt) {
    throw new Error('No exportedKey found in session');
  }

  const key = await importKey(exportedKey);
  const decryptedData = await decryptWithKey(key, JSON.parse(encryptedData));

  return decryptedData;
};

export const passwordClearKey = async () => {
  if (isManifestV3) {
    await Browser.storage.session.remove(['exportedKey', 'salt']);
  }
};
