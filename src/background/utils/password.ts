import { isManifestV3 } from '@/utils/env';
import * as encryptor from '@metamask/browser-passworder';
import { decryptWithDetail } from '@metamask/browser-passworder';
import { isNil } from 'lodash';
import Browser from 'webextension-polyfill';

export const rabbyEncrypt = async ({
  data,
  password,
}: {
  data: any;
  password?: string | null;
}) => {
  if (!isNil(password)) {
    const { vault, exportedKeyString } = await encryptor.encryptWithDetail(
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
    throw new Error('No exportedKey found');
  }

  const key = await encryptor.importKey(exportedKey);
  const encryptedData = await encryptor.encryptWithKey(key, data);
  const vault = JSON.stringify({ ...encryptedData, salt });

  return vault;
};

export const rabbyDecrypt = async ({
  encryptedData,
  password,
}: {
  encryptedData: any;
  password?: string | null;
}) => {
  if (!isNil(password)) {
    const {
      vault,
      exportedKeyString,
      salt,
    } = await encryptor.decryptWithDetail(password, encryptedData);

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
    throw new Error('No exportedKey found');
  }

  const key = await encryptor.importKey(exportedKey);
  const decryptedData = await encryptor.decryptWithKey(
    key,
    JSON.parse(encryptedData)
  );

  return decryptedData;
};

export const rabbyClearKey = async () => {
  if (isManifestV3) {
    await Browser.storage.session.remove(['exportedKey', 'salt']);
  }
};
