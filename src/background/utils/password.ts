import { isManifestV3 } from '@/utils/env';
import * as defaultEncryptor from '@metamask/browser-passworder';
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
  encryptor,
}: {
  data: any;
  password?: string | null;
  encryptor: typeof defaultEncryptor;
}) => {
  if (!isNil(password)) {
    const { vault, exportedKeyString } = await encryptor.encryptWithDetail(
      password,
      data
    );
    const { salt } = JSON.parse(vault) as Awaited<
      ReturnType<typeof encryptor.decryptWithDetail>
    >;

    if (isManifestV3 && process.env.NODE_ENV !== 'test') {
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

  const key = await encryptor.importKey(exportedKey);
  const encryptedData = await encryptor.encryptWithKey(key, data);
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
  encryptor,
}: {
  encryptedData: string;
  password?: string | null;
  encryptor: typeof defaultEncryptor;
}) => {
  if (!isNil(password)) {
    const {
      vault,
      exportedKeyString,
      salt,
    } = await encryptor.decryptWithDetail(password, encryptedData);

    if (isManifestV3 && process.env.NODE_ENV !== 'test') {
      Browser.storage.session.set({ exportedKey: exportedKeyString, salt });
    }

    return vault;
  }

  if (!isManifestV3 || process.env.NODE_ENV === 'test') {
    return;
  }

  const { exportedKey, salt } = await Browser.storage.session.get([
    'exportedKey',
    'salt',
  ]);

  if (!exportedKey || !salt) {
    throw new Error('No exportedKey found in session');
  }

  const key = await encryptor.importKey(exportedKey);
  const decryptedData = await encryptor.decryptWithKey(
    key,
    JSON.parse(encryptedData)
  );

  return decryptedData;
};

export const passwordClearKey = async () => {
  if (isManifestV3 && process.env.NODE_ENV !== 'test') {
    await Browser.storage.session.remove(['exportedKey', 'salt']);
  }
};
