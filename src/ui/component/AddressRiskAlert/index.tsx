import { Button, Drawer, DrawerProps } from 'antd';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';
import { padWatchAccount } from '@/ui/views/SendPoly/util';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { pickKeyringThemeIcon } from '@/utils/account';
import { KEYRING_CLASS, KEYRING_ICONS, WALLET_BRAND_CONTENT } from '@/constant';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useAddressRisks } from '@/ui/hooks/useAddressRisk';
import { RiskRow } from './RiskRow';

import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { ReactComponent as RcIconCheckedCC } from 'ui/assets/address/checked-square-cc.svg';
import { ReactComponent as RcIconCheckCC } from 'ui/assets/address/check-square-cc.svg';
import { ellipsisAddress } from '@/ui/utils/address';
import { IExchange } from '../CexSelect';

interface AddressRiskAlertProps {
  visible: boolean;
  showClosableIcon?: boolean;
  title?: ReactNode;
  address: string;
  onCancel(): void;
  onConfirm?(): void;
  className?: string;
  height?: number | string;
  zIndex?: number;
  getContainer?: DrawerProps['getContainer'];
  editAlias?: string;
  editCex?: IExchange | null;
}

const AddressTyepCard = ({
  type,
  brandName,
  aliasName,
  cexInfo,
}: {
  type: string;
  brandName: string;
  aliasName: string;
  cexInfo: {
    id?: string;
    name?: string;
    logo?: string;
    isDeposit?: boolean;
  };
}) => {
  const { isDarkTheme } = useThemeMode();
  const { t } = useTranslation();

  const showCexInfo = useMemo(() => {
    return cexInfo.id && cexInfo.isDeposit && type === KEYRING_CLASS.WATCH;
  }, [cexInfo, type]);

  const showSideDesc = useMemo(() => {
    return type !== KEYRING_CLASS.WATCH || showCexInfo;
  }, [type, showCexInfo]);

  return (
    <div className="flex gap-[4px] items-center">
      <div className="bg-r-neutral-card2 rounded-[8px] px-[12px] py-[8px] flex items-center gap-[6px]">
        {showCexInfo ? (
          <img
            className="icon icon-account-type w-[20px] h-[20px]"
            src={cexInfo.logo}
          />
        ) : (
          <ThemeIcon
            className="icon icon-account-type w-[20px] h-[20px]"
            src={
              pickKeyringThemeIcon(brandName as any, isDarkTheme) ||
              WALLET_BRAND_CONTENT[brandName]?.image ||
              pickKeyringThemeIcon(type as any, isDarkTheme) ||
              KEYRING_ICONS[type]
            }
          />
        )}
        <div className="font-medium text-[13px] text-r-neutral-title1">
          {aliasName}
        </div>
      </div>
      {showSideDesc && (
        <div
          className={`
            text-r-blue-default rounded-[8px] bg-r-blue-light1 
              px-[12px] py-[6px] text-[13px] font-medium

          `}
        >
          {showCexInfo
            ? t('page.sendPoly.riskAlert.cexDepositAddress', {
                cexName: cexInfo.name,
              })
            : t('page.sendPoly.riskAlert.cexAddress', {
                cexName: brandName,
              })}
        </div>
      )}
    </div>
  );
};

export const AddressRiskAlert = ({
  title,
  visible,
  address,
  onConfirm,
  onCancel,
  className,
  height = 540,
  zIndex,
  showClosableIcon = true,
  getContainer,
  editAlias,
  editCex,
}: AddressRiskAlertProps) => {
  const handleCancel = () => {
    onCancel();
  };

  const { t } = useTranslation();

  const [checkedRisk, setCheckedRisk] = useState(false);
  // disable detect risk when unvisible
  const riskInfos = useAddressRisks(visible ? address : '', editCex);
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
      title={title || t('page.sendPoly.riskAlert.title')}
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
      <div className="flex flex-col h-full">
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
            cexInfo={{
              id: editCex?.id || riskInfos.addressDesc?.cex?.id,
              name: editCex?.name || riskInfos.addressDesc?.cex?.name,
              logo: editCex?.logo || riskInfos.addressDesc?.cex?.logo_url,
              isDeposit: editCex?.id
                ? true
                : riskInfos.addressDesc?.cex?.is_deposit,
            }}
            brandName={targetAccount.brandName}
            aliasName={
              editAlias ||
              targetAccount.alianName ||
              ellipsisAddress(targetAccount.address)
            }
          />
        </header>
        <div className="mt-[32px] flex-1">
          {riskInfos.risks.length > 0 && (
            <div className="text-r-neutral-foot text-[12px] font-medium text-center">
              {t('page.sendPoly.riskAlert.riskWarning')}
            </div>
          )}
          <main className="flex flex-col gap-[8px] mt-[8px]">
            {riskInfos.risks.map((item) => (
              <RiskRow key={item.type} desc={item.value} />
            ))}
          </main>
        </div>
        <div className="footer pb-[23px]">
          <div className="relative pb-[16px]">
            <div className="absolute left-[-20px] right-[-20px] h-[1px] bg-r-neutral-line" />
          </div>
          {riskInfos.risks.length > 0 && (
            <div
              className="whitelist-alert pb-[16px]"
              onClick={() => setCheckedRisk((pre) => !pre)}
            >
              <div className="cursor-pointer flex items-center justify-center gap-[6px]">
                {checkedRisk ? (
                  <RcIconCheckedCC className="text-r-blue-default" />
                ) : (
                  <RcIconCheckCC className="text-r-neutral-foot" />
                )}
                <span className="text-center text-r-neutral-foot text-[13px] font-medium ">
                  {t('page.sendPoly.riskAlert.understandRisks')}
                </span>
              </div>
            </div>
          )}
          <div className="btn-wrapper w-[100%] flex justify-center">
            <Button
              disabled={
                riskInfos.loading || (!!riskInfos.risks.length && !checkedRisk)
              }
              type="primary"
              onClick={onConfirm}
              size="large"
              className="w-[100%] h-[48px] text-[16px]"
            >
              {t('global.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
