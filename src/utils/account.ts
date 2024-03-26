import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_ICONS_WHITE,
  KEYRING_PURPLE_LOGOS,
  KEYRING_TYPE,
  KeyringWithIcon,
} from 'consts';
import { t } from 'i18next';

export function generateAliasName({
  keyringType,
  brandName,
  keyringName,
  keyringCount = 0,
  addressCount = 0,
}: {
  keyringType: string;
  brandName?: string;
  keyringName?: string;
  keyringCount?: number;
  addressCount?: number;
}) {
  if (keyringType === KEYRING_CLASS.MNEMONIC) {
    return `${t('background.alias.HdKeyring')} ${keyringCount + 1} #${
      addressCount + 1
    }`;
  } else if (keyringType === KEYRING_TYPE.SimpleKeyring) {
    return `${t('background.alias.simpleKeyring')} ${keyringCount + 1}`;
  } else {
    if (
      keyringType === KEYRING_TYPE.WatchAddressKeyring ||
      brandName === KEYRING_TYPE.WatchAddressKeyring
    ) {
      return `${t('background.alias.watchAddressKeyring')} ${addressCount + 1}`;
    }

    // The name the keyring itself suggests should be used
    if (keyringName) {
      return `${keyringName} ${addressCount + 1}`;
    }

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

export function pickKeyringThemeIcon(
  keyringClass?: KeyringWithIcon,
  options?:
    | boolean
    | {
        needLightVersion?: boolean;
        purpleFirst?: boolean;
      }
) {
  if (!keyringClass) return null;

  if (typeof options !== 'object') {
    options = { needLightVersion: !!options };
  }

  const {
    needLightVersion,
    purpleFirst = ![KEYRING_CLASS.PRIVATE_KEY, KEYRING_CLASS.MNEMONIC].includes(
      keyringClass as any
    ),
  } = options || {};

  if (
    purpleFirst &&
    keyringClass in KEYRING_PURPLE_LOGOS &&
    KEYRING_PURPLE_LOGOS[keyringClass]
  ) {
    return KEYRING_PURPLE_LOGOS[keyringClass];
  }

  return needLightVersion
    ? KEYRING_ICONS_WHITE[keyringClass]
    : KEYRING_ICONS[keyringClass];
}
