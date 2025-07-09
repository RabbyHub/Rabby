import {
  Button,
  Drawer,
  DrawerProps,
  Form,
  Input,
  Skeleton,
  Switch,
  Tooltip,
} from 'antd';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import styled, { createGlobalStyle } from 'styled-components';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
import { padWatchAccount } from '@/ui/views/SendPoly/util';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { findAccountByPriority, pickKeyringThemeIcon } from '@/utils/account';
import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useAddressRisks } from '@/ui/hooks/useAddressRisk';
import { RiskRow } from './RiskRow';
import { ellipsisAddress } from '@/ui/utils/address';
import { IExchange } from '../CexSelect';

import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

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
  type?: string;
}

const StyledTooltipGlobalStyle = createGlobalStyle`
  .alias-tooltip {
    .ant-tooltip-inner {
      border-radius: 2px !important;
    }
    .ant-tooltip-arrow {
      display: block !important;
    }
  }
`;

const AuthFormItemWrapper = styled.div`
  .ant-form-item {
    margin-bottom: 20px !important;
  }
  .ant-form-item-has-error {
    .ant-input {
      border-color: #f24822 !important;
    }
  }
  .ant-input.ant-input-lg.popup-input {
    border: 1px solid var(--r-neutral-line, #d3d8e0) !important;
    background: var(--r-neutral-card1, #ffffff) !important;
    &::placeholder {
      color: var(--r-neutral-foot, #6a7587) !important;
    }
    &:focus,
    &:hover {
      border-color: var(--r-blue-default, #7084ff) !important;
    }
  }
`;

export const AddressTypeCard = ({
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
    <div className="flex gap-[8px] items-center justify-center">
      <StyledTooltipGlobalStyle />
      <Tooltip overlayClassName="alias-tooltip" title={aliasName}>
        <div className="bg-r-neutral-card2 rounded-[8px] px-[12px] h-[32px] flex items-center gap-[6px]">
          {showCexInfo ? (
            <img
              className="icon icon-account-type w-[20px] h-[20px] rounded-full"
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
          <div
            className={clsx(
              'font-medium text-[13px] text-r-neutral-title1',
              showSideDesc ? 'max-w-[100px]  truncate' : ''
            )}
          >
            {aliasName}
          </div>
        </div>
      </Tooltip>
      {showSideDesc && (
        <div
          className={`
            text-r-blue-default rounded-[8px] bg-r-blue-light1 
              px-[12px] h-[32px] text-[13px] font-medium flex items-center
              whitespace-nowrap overflow-hidden text-ellipsis
          `}
        >
          {showCexInfo
            ? t('page.sendPoly.riskAlert.cexDepositAddress', {
                cexName: cexInfo.name,
              })
            : t('page.sendPoly.riskAlert.cexAddress', {
                cexName: BRAND_ALIAN_TYPE_TEXT[type],
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
  type,
}: AddressRiskAlertProps) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));

  const [form] = Form.useForm();
  const [hasInputPassword, setHasInputPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [inWhiteList, setInWhiteList] = useState(false);
  // disable detect risk when invisible
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

  const targetAccount = useMemo(() => {
    const targetTypeAccounts = accountsList.filter(
      (acc) =>
        isSameAddress(acc.address, address) &&
        (type
          ? type.toLocaleLowerCase() === acc.type.toLocaleLowerCase()
          : true)
    );
    if (targetTypeAccounts.length > 0) {
      return findAccountByPriority(targetTypeAccounts);
    }
    const targetSameAddressAccounts = accountsList.filter((acc) =>
      isSameAddress(acc.address, address)
    );
    if (targetSameAddressAccounts.length > 0) {
      return findAccountByPriority(targetSameAddressAccounts);
    }
    return padWatchAccount(address);
  }, [accountsList, address, type]);

  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      await wallet?.verifyPassword(password);
      if (inWhiteList) {
        await wallet.addWhitelist(password, address);
      } else {
        await wallet.removeWhitelist(address);
      }
      onConfirm?.();
    } catch (e: any) {
      setPasswordError(true);
      form.setFields([
        {
          name: 'password',
          errors: [
            e?.message || t('component.AuthenticationModal.passwordError'),
          ],
        },
      ]);
    }
  };

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
      onClose={onCancel}
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
          className={clsx(
            'header bg-r-neutral-card1 rounded-[8px] px-[16px] py-[20px]',
            'flex flex-col items-center gap-[8px]',
            {
              'pb-0': riskInfos.hasNotRisk,
            }
          )}
        >
          {riskInfos.loadingAddrDesc ? (
            <Skeleton.Input className="w-full h-[44px] rounded-[8px]" active />
          ) : (
            <div className="text-[16px] w-full text-center">
              <span className="text-r-neutral-title1 font-medium">
                {addressSplit[0]}
              </span>
              <span className="text-r-neutral-foot">{addressSplit[1]}</span>
              <span className="text-r-neutral-title1 font-medium">
                {addressSplit[2]}
              </span>
            </div>
          )}
          {riskInfos.loadingAddrDesc ? (
            <Skeleton.Input
              className="w-[100px] h-[32px] rounded-[8px] mt-[3px]"
              active
            />
          ) : (
            <AddressTypeCard
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
          )}
          {riskInfos.hasNotRisk && (
            <div className="w-full mt-[12px]">
              <div className="relative">
                <div className="absolute w-[calc(100%+32px)] left-[-16px] right-[-16px] h-[1px] bg-r-neutral-line" />
              </div>
              <div className="w-full h-[48px] flex flex-row justify-between items-center">
                <div className="text-r-neutral-body text-[13px]">
                  {t('page.sendPoly.riskAlert.TransferBefore')}
                </div>
                <div className="text-r-neutral-title1 font-medium text-[13px]">
                  {t('page.sendPoly.riskAlert.TransferBeforeValue')}
                </div>
              </div>
              <div className="w-full h-[48px] flex flex-row justify-between items-center">
                <div className="text-r-neutral-body text-[13px]">
                  {t('page.sendPoly.riskAlert.AddToWhitelist')}
                </div>
                <div>
                  <Switch
                    checked={inWhiteList}
                    onChange={(v) => {
                      setInWhiteList(!!v);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </header>
        {riskInfos.loadingHasTransfer ? (
          <div className="flex-1">
            <div className="flex gap-[8px] mt-[30px] items-center bg-r-neutral-card1 rounded-[8px] py-[14px] px-[16px]">
              <Skeleton.Avatar className="w-[16px] h-[16px] rounded-full" />
              <Skeleton.Input className="w-[158px] rounded-[4px]" active />
            </div>
          </div>
        ) : (
          <div className="mt-[20px] flex-1">
            <main className="flex flex-col gap-[8px] mt-[8px]">
              {riskInfos.risks.map((item) => (
                <RiskRow key={item.type} desc={item.value} />
              ))}
            </main>
          </div>
        )}
        <div className="footer pb-[20px]">
          <div className="relative pb-[20px]">
            <div className="absolute left-[-20px] right-[-20px] h-[1px] bg-r-neutral-line" />
          </div>
          <div className="btn-wrapper w-[100%] flex justify-center">
            <Form className="w-full" onFinish={handleSubmit} form={form}>
              <AuthFormItemWrapper>
                <Form.Item
                  name="password"
                  rules={[
                    {
                      required: true,
                      message: t(
                        'component.AuthenticationModal.passwordRequired'
                      ),
                    },
                  ]}
                >
                  <Input
                    className="popup-input"
                    placeholder={t(
                      'page.sendPoly.riskAlert.passwordPlaceholder'
                    )}
                    onChange={(e) => {
                      setHasInputPassword(e.target.value.length > 0);
                      setPasswordError(false);
                    }}
                    type="password"
                    size="large"
                    autoFocus
                    spellCheck={false}
                  />
                </Form.Item>
              </AuthFormItemWrapper>
              <Button
                disabled={
                  riskInfos.loading || !hasInputPassword || passwordError
                }
                type="primary"
                htmlType="submit"
                size="large"
                className="w-[100%] h-[48px] text-[16px]"
              >
                {t('global.confirm')}
              </Button>
            </Form>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
