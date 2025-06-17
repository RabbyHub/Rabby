import { Drawer, DrawerProps } from 'antd';
import React, { ReactNode, useEffect, useMemo } from 'react';

import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';
import { padWatchAccount } from '@/ui/views/SendPoly/util';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { pickKeyringThemeIcon } from '@/utils/account';
import { KEYRING_ICONS, WALLET_BRAND_CONTENT } from '@/constant';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useAddressRisks } from '@/ui/hooks/useAddressRisk';
import { RiskRow } from './RiskRow';

interface AddressRiskAlertProps {
  visible: boolean;
  showClosableIcon?: boolean;
  title?: ReactNode;
  address: string;
  onCancel(): void;
  className?: string;
  height?: number | string;
  zIndex?: number;
  getContainer?: DrawerProps['getContainer'];
}

const AddressTyepCard = ({
  type,
  brandName,
  aliasName,
}: {
  type: string;
  brandName: string;
  aliasName: string;
}) => {
  const { isDarkTheme } = useThemeMode();

  return (
    <div className="bg-r-neutral-card2 rounded-[8px] px-[12px] py-[8px] flex items-center gap-[6px]">
      <ThemeIcon
        className="icon icon-account-type w-[20px] h-[20px]"
        src={
          pickKeyringThemeIcon(brandName as any, isDarkTheme) ||
          WALLET_BRAND_CONTENT[brandName]?.image ||
          pickKeyringThemeIcon(type as any, isDarkTheme) ||
          KEYRING_ICONS[type]
        }
      />
      <div className="font-medium text-[13px] text-r-neutral-title1">
        {aliasName}
      </div>
    </div>
  );
};

export const AddressRiskAlert = ({
  title,
  visible,
  address,
  onCancel,
  className,
  height = 540,
  zIndex,
  showClosableIcon = true,
  getContainer,
}: AddressRiskAlertProps) => {
  const handleCancel = () => {
    onCancel();
  };

  const { t } = useTranslation();

  const riskInfos = useAddressRisks(address);
  const addressSplit = useMemo(() => {
    if (!address) {
      return [];
    }
    const prefix = address.slice(0, 8);
    const middle = address.slice(8, -6);
    const suffix = address.slice(-6);

    return [prefix, middle, suffix];
  }, [address]);

  const dispatch = useRabbyDispatch();
  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));

  const targetAccount = useMemo(() => {
    return (
      accountsList.find((acc) => isSameAddress(acc.address, address)) ||
      padWatchAccount(address)
    );
  }, [accountsList, address]);

  useEffect(() => {
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, []);

  return (
    <Drawer
      title={title || 'Send to this Address'}
      width="400px"
      height={height}
      closable={showClosableIcon}
      placement={'bottom'}
      visible={visible}
      onClose={handleCancel}
      className={clsx('custom-popup is-support-darkmode is-new', className)}
      zIndex={zIndex}
      destroyOnClose
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
      }
      getContainer={getContainer}
      bodyStyle={{
        paddingBottom: 0,
      }}
    >
      <div>
        <header
          className={`
              header bg-r-neutral-card1 rounded-[8px] px-[16px] py-[20px]
              flex flex-col items-center gap-[8px]
           `}
        >
          <div className="text-[16px] w-full text-center">
            <span className="text-r-neutral-title1 font-medium">
              {addressSplit[0]}
            </span>
            <span className="text-r-neutral-foot">{addressSplit[1]}</span>
            <span className="text-r-neutral-title1 font-medium">
              {addressSplit[2]}
            </span>
          </div>
          <AddressTyepCard
            type={targetAccount.type}
            brandName={targetAccount.brandName}
            aliasName={targetAccount.alianName}
          />
        </header>
        <div className="mt-[32px]">
          <div className="text-r-neutral-foot text-[12px] font-medium text-center">
            Risk Warining
          </div>
          <main className="flex flex-col gap-[8px] mt-[8px]">
            {riskInfos.risks.map((item) => (
              <RiskRow key={item.type} desc={item.value} />
            ))}
          </main>
        </div>
      </div>
    </Drawer>
  );
};
