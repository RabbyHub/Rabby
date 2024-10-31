import sinon from 'sinon';
import type { Json } from '@metamask/utils';

export const PASSWORD = 'password123';
export const MOCK_ENCRYPTION_KEY = JSON.stringify({
  alg: 'A256GCM',
  ext: true,
  k: 'wYmxkxOOFBDP6F6VuuYFcRt_Po-tSLFHCWVolsHs4VI',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  key_ops: ['encrypt', 'decrypt'],
  kty: 'oct',
});
export const MOCK_ENCRYPTION_SALT =
  'HQ5sfhsb8XAQRJtD+UqcImT7Ve4n3YMagrh05YTOsjk=';
export const MOCK_HARDCODED_KEY = 'key';
export const MOCK_HEX = '0xabcdef0123456789';
// eslint-disable-next-line no-restricted-globals
const MOCK_KEY = Buffer.alloc(32);
const INVALID_PASSWORD_ERROR = 'Incorrect password.';

let cacheVal: Json;
export default {
  async encrypt(password: string, dataObj: any) {
    return JSON.stringify({
      ...(await this.encryptWithKey(password, dataObj)),
      salt: this.generateSalt(),
    });
  },

  async decrypt(_password: string, _text: string) {
    if (_password && _password !== PASSWORD) {
      throw new Error(INVALID_PASSWORD_ERROR);
    }

    return cacheVal ?? {};
  },

  async encryptWithKey(_key: unknown, dataObj: any) {
    cacheVal = dataObj;
    return {
      data: MOCK_HEX,
      iv: 'anIv',
    };
  },

  async encryptWithDetail(key: string, dataObj: any) {
    return {
      vault: await this.encrypt(key, dataObj),
      exportedKeyString: MOCK_HARDCODED_KEY,
    };
  },

  async decryptWithDetail(key: string, text: string) {
    return {
      vault: await this.decrypt(key, text),
      salt: MOCK_ENCRYPTION_SALT,
      exportedKeyString: MOCK_ENCRYPTION_KEY,
    };
  },

  async decryptWithKey(key: unknown, text: string) {
    return this.decrypt(key as string, text);
  },

  async keyFromPassword(_password: string) {
    return MOCK_KEY;
  },

  async importKey(key: string) {
    if (key === '{}') {
      throw new TypeError(
        `Failed to execute 'importKey' on 'SubtleCrypto': The provided value is not of type '(ArrayBuffer or ArrayBufferView or JsonWebKey)'.`
      );
    }
    return null;
  },

  async updateVault(_vault: string, _password: string) {
    return _vault;
  },

  isVaultUpdated(_vault: string) {
    return true;
  },

  generateSalt() {
    return MOCK_ENCRYPTION_SALT;
  },
};
