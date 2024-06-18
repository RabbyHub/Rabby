import { ChainWithBalance } from '@rabby-wallet/rabby-api/dist/types';
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
import { DisplayChainWithWhiteLogo, findChain } from './chain';

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

const formatChain = (item: ChainWithBalance): DisplayChainWithWhiteLogo => {
  const chain = findChain({
    id: item.community_id,
  });

  return {
    ...item,
    logo: chain?.logo || item.logo_url,
    whiteLogo: chain?.whiteLogo,
  };
};

export function normalizeChainList(chain_balances: ChainWithBalance[]) {
  return chain_balances
    .filter((item) => item.born_at !== null)
    .map(formatChain);
}

export function filterChainWithBalance(chainList: DisplayChainWithWhiteLogo[]) {
  return chainList.filter((item) => item.usd_value > 0);
}

export function normalizeAndVaryChainList(chain_balances: ChainWithBalance[]) {
  const chainList: DisplayChainWithWhiteLogo[] = [];
  const chainListWithValue: DisplayChainWithWhiteLogo[] = [];

  chain_balances.forEach((item) => {
    const chain = formatChain(item);
    if (!item.born_at) return;

    chainList.push(chain);

    if (item.usd_value > 0) {
      chainListWithValue.push(chain);
    }
  });

  return {
    chainList,
    chainListWithValue,
  };
}
