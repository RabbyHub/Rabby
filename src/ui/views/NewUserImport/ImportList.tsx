import React, { useState } from 'react';
import clsx from 'clsx';
import { useHistory, useLocation } from 'react-router-dom';
import { Card } from '@/ui/component/NewUserImport';
import { ReactComponent as RcIconArrowDownCC } from '@/ui/assets/new-user-import/arrow-down-cc.svg';
import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import { Item } from '@/ui/component';
import { useTranslation } from 'react-i18next';

export const ImportWalletList = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const [showMore, setShowMore] = useState(false);

  const tipList = React.useMemo(
    () =>
      [
        {
          type: KEYRING_TYPE.HdKeyring,
          logo: KEYRING_ICONS[KEYRING_TYPE.HdKeyring],
        },
        {
          type: KEYRING_TYPE.SimpleKeyring,
          logo: KEYRING_ICONS[KEYRING_TYPE.SimpleKeyring],
        },
        {
          type: KEYRING_CLASS.HARDWARE.LEDGER,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.LEDGER].icon,
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
        },
        {
          type: KEYRING_CLASS.HARDWARE.GRIDPLUS,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.GRIDPLUS].icon,
        },
        {
          type: KEYRING_CLASS.HARDWARE.BITBOX02,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.BITBOX02].icon,
        },
        {
          type: KEYRING_CLASS.GNOSIS,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.GNOSIS].icon,
        },
      ].slice(0, !showMore ? 3 : undefined),
    [showMore]
  );

  const gotoImport = (type: typeof tipList[number]['type']) => {
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
        history.push(`/new-user/import/${type}/set-password`);
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
      className="relative"
      onBack={() => {
        if (history.length) {
          history.goBack();
        } else {
          history.replace('/new-user/guide');
        }
      }}
      title={t('page.newUserImport.importList.title')}
    >
      <div className="mt-24 flex flex-col items-center justify-center gap-16">
        {tipList.map((item, index) => {
          return (
            <Item
              key={item.type}
              bgColor="var(--r-neutral-card2, #F2F4F7)"
              px={16}
              py={20}
              leftIcon={item.logo}
              leftIconClassName="w-24 h-24 mr-12"
              onClick={() => {
                gotoImport(item.type);
              }}
              className="rounded-[8px] text-[17px] font-medium text-r-neutral-title1"
            >
              {BRAND_ALIAN_TYPE_TEXT[item.type]}
            </Item>
          );
        })}
      </div>
      {!showMore && (
        <div
          onClick={() => {
            setShowMore(true);
          }}
          className={clsx(
            'absolute left-1/2 bottom-24 transform -translate-x-1/2',
            'flex justify-center items-center gap-2',
            'cursor-pointer',
            'text-13 text-r-neutral-foot'
          )}
        >
          <span>More</span>
          <RcIconArrowDownCC
            className="w-[12px] h-[12px]"
            viewBox="0 0 12 12"
          />
        </div>
      )}
    </Card>
  );
};
