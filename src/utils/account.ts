import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import { t } from 'i18next';

export function generateAliasName({
  keyringType,
  brandName,
  keyringCount = 0,
  addressCount = 0,
}: {
  keyringType: string;
  brandName?: string;
  keyringCount?: number;
  addressCount?: number;
}) {
  if (keyringType === KEYRING_CLASS.MNEMONIC) {
    return `${BRAND_ALIAN_TYPE_TEXT[KEYRING_TYPE.HdKeyring]} ${
      keyringCount + 1
    } #${addressCount + 1}`;
  } else if (keyringType === KEYRING_TYPE.SimpleKeyring) {
    return `${BRAND_ALIAN_TYPE_TEXT[keyringType] || brandName} ${
      keyringCount + 1
    }`;
  } else {
    if (brandName) {
      return `${BRAND_ALIAN_TYPE_TEXT[brandName] || brandName} ${
        addressCount + 1
      }`;
    }
    return `${BRAND_ALIAN_TYPE_TEXT[keyringType] || brandName} ${
      addressCount + 1
    }`;
  }
}
