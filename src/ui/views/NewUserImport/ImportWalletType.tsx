import {
  KEYRING_CLASS,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import IconBitget from '@/ui/assets/new-user-import/wallet/bitget.svg';
import IconCoinbase from '@/ui/assets/new-user-import/wallet/coinbase.svg';
import IconMetamask from '@/ui/assets/new-user-import/wallet/metamask.svg';
import IconOKX from '@/ui/assets/new-user-import/wallet/okx.svg';
import IconPhantom from '@/ui/assets/new-user-import/wallet/phantom.svg';
import { Item } from '@/ui/component';
import { Card } from '@/ui/component/NewUserImport';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

const otherWallets = [
  {
    logo: IconMetamask,
    name: 'MetaMask',
  },
  {
    logo: IconOKX,
    name: 'OKX',
  },
  {
    logo: IconPhantom,
    name: 'Phantom',
  },
  {
    logo: IconBitget,
    name: 'BitGet',
  },
  {
    logo: IconCoinbase,
    name: 'Coinbase',
  },
];

export const ImportWalletType = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const hardwareWallets = React.useMemo(
    () => [
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
        <Item
          bgColor="var(--r-neutral-card2, #F2F4F7)"
          px={16}
          py={20}
          leftIconClassName="w-24 h-24 mr-12"
          onClick={() => {
            history.push({
              pathname: '/new-user/import/seed-or-key',
            });
          }}
          className="pl-[18px] rounded-[8px] text-[20px] leading-[24px] py-[21px] font-medium text-r-neutral-title1"
        >
          <div className="space-y-[12px]">
            <div>{t('page.newUserImport.importWalletType.seedOrKey')}</div>
            <div className="flex items-center gap-[12px]">
              {otherWallets.map((item) => {
                return (
                  <img
                    key={item.logo}
                    src={item.logo}
                    alt=""
                    className="w-[20px] h-[20px]"
                  />
                );
              })}
            </div>
          </div>
        </Item>
        <Item
          bgColor="var(--r-neutral-card2, #F2F4F7)"
          px={16}
          py={20}
          leftIconClassName="w-24 h-24 mr-12"
          onClick={() => {
            history.push({
              pathname: '/new-user/import-hardware-list',
            });
          }}
          className="pl-[18px] rounded-[8px] text-[20px] leading-[24px] py-[21px] font-medium text-r-neutral-title1"
        >
          <div className="space-y-[12px]">
            <div>{t('page.newUserImport.importWalletType.hardwareWallet')}</div>
            <div className="flex items-center gap-[12px]">
              {hardwareWallets.map((item) => {
                return (
                  <img
                    key={item.logo}
                    src={item.logo}
                    alt=""
                    className="w-[20px] h-[20px] rounded-full"
                  />
                );
              })}
            </div>
          </div>
        </Item>
      </div>
    </Card>
  );
};
