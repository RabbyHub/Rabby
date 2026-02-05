import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import { Item } from '@/ui/component';
import { Card } from '@/ui/component/NewUserImport';
import { Tooltip } from 'antd';
import qs from 'qs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

export const ImportHardwareList = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const tipList = React.useMemo(
    () => [
      {
        type: KEYRING_CLASS.HARDWARE.LEDGER,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.LEDGER].icon,
        preventClick:
          WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.LEDGER].preventClick,
        tipI18nKey: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.LEDGER].tipI18nKey,
      },
      {
        type: KEYRING_CLASS.HARDWARE.TREZOR,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.TREZOR].icon,
      },
      {
        type: KEYRING_CLASS.HARDWARE.ONEKEY,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.ONEKEY].icon,
      },
      {
        type: KEYRING_CLASS.HARDWARE.KEYSTONE,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE].icon,
        brand: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE].brand,
      },
      {
        type: KEYRING_CLASS.HARDWARE.GRIDPLUS,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.GRIDPLUS].icon,
      },
      {
        type: KEYRING_CLASS.HARDWARE.IMKEY,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.IMKEY].icon,
      },
      {
        type: KEYRING_CLASS.HARDWARE.BITBOX02,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.BITBOX02].icon,
      },

      {
        type: KEYRING_CLASS.HARDWARE.KEYSTONE,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.NGRAVEZERO].icon,
        brand: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.NGRAVEZERO].brand,
      },
      {
        type: KEYRING_CLASS.HARDWARE.KEYSTONE,
        logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.AIRGAP].icon,
        brand: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.AIRGAP].brand,
      },
    ],
    []
  );

  const gotoImport = (
    type: typeof tipList[number]['type'],
    brand?: typeof tipList[number]['brand']
  ) => {
    switch (type) {
      case KEYRING_TYPE.SimpleKeyring:
        history.push('/new-user/import/private-key');
        break;
      case KEYRING_TYPE.HdKeyring:
        history.push('/new-user/import/seed-phrase');
        break;
      case KEYRING_CLASS.HARDWARE.LEDGER:
      case KEYRING_CLASS.HARDWARE.KEYSTONE:
      case KEYRING_CLASS.HARDWARE.ONEKEY:
      case KEYRING_CLASS.HARDWARE.TREZOR:
      case KEYRING_CLASS.HARDWARE.GRIDPLUS:
      case KEYRING_CLASS.HARDWARE.BITBOX02:
      case KEYRING_CLASS.HARDWARE.IMKEY:
        history.push({
          pathname: `/new-user/import/${type}/set-password`,
          search: qs.stringify({
            brand,
          }),
        });
        break;
      case KEYRING_CLASS.GNOSIS:
        history.push('/new-user/import/gnosis-address');
        break;
      default:
        history.push('/new-user/import/seed-phrase');
        break;
    }
  };

  return (
    <Card
      className="relative h-[520px] overflow-auto no-scrollbar"
      onBack={() => {
        if (history.length) {
          history.goBack();
        } else {
          history.replace('/new-user/guide');
        }
      }}
      title={t('page.newUserImport.importHardwareList.title')}
    >
      <div className="mt-[16px] flex flex-col items-center justify-center gap-[12px]">
        {tipList.map((item, index) => {
          return (
            <Tooltip
              title={item.tipI18nKey ? t(item.tipI18nKey) : undefined}
              key={item.type + index}
              overlayClassName="rectangle"
            >
              <Item
                key={item.type + index}
                bgColor="var(--r-neutral-card2, #F2F4F7)"
                px={16}
                py={13}
                leftIcon={item.logo}
                leftIconClassName="w-24 h-24 mr-12"
                disabled={item.preventClick}
                onClick={() => {
                  if (item.preventClick) {
                    return;
                  }
                  gotoImport(item.type, item.brand);
                }}
                className="rounded-[8px] text-[15px] leading-[18px] font-medium text-r-neutral-title1"
              >
                {item.brand || BRAND_ALIAN_TYPE_TEXT[item.type]}
              </Item>
            </Tooltip>
          );
        })}
      </div>
    </Card>
  );
};
