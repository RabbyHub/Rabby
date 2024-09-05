import React, { useEffect, useMemo, useState } from 'react';
import { ReactComponent as RcIconGas } from '@/ui/assets/sign/tx/gas-cc.svg';
import { ReactComponent as RcIconGasAccountCC } from '@/ui/assets/sign/tx/gas-account-blur-cc.svg';

import GasLessBg from '@/ui/assets/sign/tx/bg.svg';
import { ReactComponent as RcIconLogo } from '@/ui/assets/dashboard/rabby.svg';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import clsx from 'clsx';
import LogoImage from 'ui/assets/sign/tx/rabby.svg';
import { ReactComponent as RcIconCCFreeGasBg } from '@/ui/assets/free-gas/bg.svg';

import { useThemeMode } from '@/ui/hooks/usePreference';
import { GasAccountCheckResult } from '@/background/service/openapi';
import { Button } from 'antd';
import {
  GasAccountDepositTipPopup,
  GasAccountLogInTipPopup,
} from '@/ui/views/GasAccount/components/GasAccountTxPopups';

export type GasLessConfig = {
  button_text: string;
  before_click_text: string;
  after_click_text: string;
  logo: string;
  theme_color: string;
  dark_color: string;
};

export function GasLessNotEnough({
  gasLessFailedReason,
  gasAccountCost,
  onChangeGasAccount,
}: {
  url?: string;
  gasLessFailedReason?: string;
  gasAccountCost?: GasAccountCheckResult;
  onChangeGasAccount?: () => void;
}) {
  const { t } = useTranslation();
  const [
    hoverGasLessFailedReason,
    setHoverGasLessFailedReason,
  ] = React.useState(false);

  const canUseGasAccount =
    !!gasAccountCost?.is_gas_account &&
    !!gasAccountCost?.balance_is_enough &&
    !gasAccountCost?.chain_not_support;

  return (
    <div
      className="security-level-tip bg-r-neutral-card2 text-r-neutral-card2 mt-[15px] items-center"
      onMouseEnter={() => setHoverGasLessFailedReason(true)}
      onMouseLeave={() => setHoverGasLessFailedReason(false)}
    >
      <RcIconGas
        viewBox="0 0 16 16"
        className="w-16 h-16 mr-4 text-r-neutral-title-1"
      />
      <span className="relative flex-1 text-r-neutral-title1 inline-flex gap-4 items-center">
        {t('page.signFooterBar.gasAccount.notEnough')}
      </span>

      {canUseGasAccount ? (
        <div
          style={{
            cursor: 'pointer',
            padding: '7px 8px',
            borderRadius: 6,
            background: 'var(--r-blue-default, #7084FF)',
            boxShadow: '0px 1px 4px 0px rgba(65, 89, 188, 0.33)',
          }}
          onClick={onChangeGasAccount}
        >
          {t('page.signFooterBar.gasAccount.useGasAccount')}
        </div>
      ) : null}
    </div>
  );
}

const LinearGradientAnimatedSpan = styled.span`
  font-size: 12px;
  border-radius: 6px;
  background: linear-gradient(94deg, #60bcff 14.47%, #8154ff 93.83%);
  background-size: 150% 100%;
  background-repeat: repeat-x;
  box-shadow: 0px 1px 4px 0px rgba(65, 89, 188, 0.33);
  animation: gradientLoading 3s ease infinite;

  @keyframes gradientLoading {
    0% {
      background-position: 0% 0%;
    }
    25% {
      background-position: 100% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    75% {
      background-position: 0% 100%;
    }
    100% {
      background-position: 0% 0%;
    }
  }
`;

const GasLessReady = styled.div`
  position: relative;
  height: 54px;

  & > .gas-ready,
  & > .gas-to-sign {
    position: absolute !important;
    top: 8px;
    left: 0;
    width: 100%;

    transition-property: z-index;
    transition-duration: 0s;
    transition-delay: 0.6s;
  }

  & > .gas-ready {
    z-index: -1;
    margin-top: -2px !important;
  }

  & > .gas-to-sign {
    z-index: 1;
    margin-top: 4px !important;
  }

  &.gasLess > {
    .gas-ready {
      z-index: 1;
    }
    .gas-to-sign {
      z-index: -1;
    }
  }
`;

function FreeGasReady({
  freeGasText,
  color,
  logo,
}: {
  freeGasText?: string;
  color?: string;
  logo?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={clsx(
        'gas-ready security-level-tip text-transparent py-0 pt-[18px] h-[46px]',
        'bg-transparent'
      )}
      style={
        freeGasText
          ? {}
          : {
              backgroundImage: `url(${GasLessBg})`,
            }
      }
    >
      {logo ? (
        <img src={logo} className="w-16 h-16 mr-4" />
      ) : (
        <RcIconLogo viewBox="0 0 20 20" className="w-16 h-16 mr-4 " />
      )}
      <span
        className="flex-1"
        style={{
          color: color || 'var(--r-blue-default, #7084FF)',
          fontSize: '13px',
          fontWeight: '500',
        }}
      >
        {freeGasText || t('page.signFooterBar.gasless.rabbyPayGas')}
      </span>
    </span>
  );
}

export function GasLessToSign({
  handleFreeGas,
  gasLessEnable,
}: {
  handleFreeGas: () => void;
  gasLessEnable: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <GasLessReady className={clsx(gasLessEnable && 'gasLess')}>
        <FreeGasReady />
        <span className="gas-to-sign security-level-tip bg-r-neutral-card2 text-r-neutral-card2 items-center pr-6">
          <RcIconGas
            viewBox="0 0 16 16"
            className="w-16 h-16 mr-4 text-r-neutral-title-1"
          />
          <span className="flex-1 text-r-neutral-title-1">
            {t('page.signFooterBar.gasless.notEnough')}
          </span>

          <LinearGradientAnimatedSpan
            className="mr-auto px-10 py-[7px] text-r-neutral-title-2 cursor-pointer"
            onClick={handleFreeGas}
          >
            {t('page.signFooterBar.gasless.GetFreeGasToSign')}
          </LinearGradientAnimatedSpan>
        </span>
      </GasLessReady>
    </>
  );
}

export function GasLessActivityToSign({
  handleFreeGas,
  gasLessEnable,
  gasLessConfig,
}: {
  handleFreeGas: () => void;
  gasLessEnable: boolean;

  gasLessConfig?: GasLessConfig;
}) {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  const themeColor = isDarkTheme
    ? gasLessConfig?.dark_color
    : gasLessConfig?.theme_color;

  return (
    <>
      <GasLessReady className={clsx(gasLessEnable && 'gasLess')}>
        <FreeGasReady
          freeGasText={gasLessConfig?.after_click_text}
          color={themeColor}
          logo={gasLessConfig?.logo}
        />
        {!!themeColor && (
          <RcIconCCFreeGasBg
            style={{
              color: themeColor,
            }}
            className="h-[45px] w-full absolute top-[7px]"
          />
        )}
        <span
          className={clsx(
            'gas-to-sign security-level-tip  items-center pr-6',
            themeColor
              ? 'bg-transparent text-transparent'
              : 'bg-r-neutral-card2 text-r-neutral-card2'
          )}
        >
          {gasLessConfig?.logo ? (
            <img src={gasLessConfig?.logo} className="w-16 h-16 mr-4" />
          ) : (
            <RcIconGas
              viewBox="0 0 16 16"
              className="w-16 h-16 mr-4 text-r-neutral-title-1"
            />
          )}

          <span
            className={clsx(
              'flex-1',
              themeColor ? '' : 'text-r-neutral-title-1'
            )}
            style={{
              color: themeColor,
            }}
          >
            {gasLessConfig?.before_click_text ||
              t('page.signFooterBar.gasless.notEnough')}
          </span>

          <LinearGradientAnimatedSpan
            className={clsx(
              'mr-auto px-10 py-[7px]  cursor-pointer text-r-neutral-title-2'
            )}
            style={{
              background: themeColor,
            }}
            onClick={handleFreeGas}
          >
            {gasLessConfig?.button_text ||
              t('page.signFooterBar.gasless.GetFreeGasToSign')}
          </LinearGradientAnimatedSpan>
        </span>
      </GasLessReady>
    </>
  );
}

export const GasLessAnimatedWrapper = styled.div`
  &.gasLess,
  .gasLess {
    background-color: var(--r-blue-disable);
    background-image: url(${LogoImage}),
      linear-gradient(
        var(--r-blue-default, #7084ff),
        var(--r-blue-default, #7084ff)
      );
    background-repeat: no-repeat;
    background-size: 10%, 200%;
    background-position-x: -12%, 200%;
    background-position-y: center;
    animation: gasLessLoading 0.9s linear 1 forwards,
      gasLessJump 0.3s linear 3 forwards;

    &.gasLessConfig {
      background-color: var(--gas-bg-color);
      background-image: linear-gradient(transparent, transparent),
        linear-gradient(var(--gas-theme-color), var(--gas-theme-color));
    }
  }

  @keyframes gasLessLoading {
    0% {
      background-position-x: -12%, 212%;
    }

    50% {
      background-position-x: 55%, 150%;
    }
    99% {
      background-position-x: 100%, 109%;
    }

    100% {
      background-position-x: 120%, 100%;
    }
  }

  @keyframes gasLessJump {
    0% {
      background-position-y: 100%, 200%;
    }

    90% {
      background-position-y: 0%, 100%;
    }

    100% {
      background-position-y: 50%, 100%;
    }
  }
`;

export function GasAccountTips({
  gasAccountCost,
  isGasAccountLogin,
  isWalletConnect,
}: {
  gasAccountCost?: GasAccountCheckResult;
  isGasAccountLogin?: boolean;
  isWalletConnect?: boolean;
}) {
  const { t } = useTranslation();
  const [tipPopupVisible, setTipPopupVisible] = useState(false);

  const [tip, btnText] = useMemo(() => {
    if (isWalletConnect) {
      return [t('page.signFooterBar.gasAccount.WalletConnectTips'), null];
    }
    if (!isGasAccountLogin) {
      return [
        t('page.signFooterBar.gasAccount.loginFirst'),
        t('page.signFooterBar.gasAccount.login'),
      ];
    }
    if (gasAccountCost?.chain_not_support) {
      return [t('page.signFooterBar.gasAccount.chainNotSupported'), null];
    }
    if (!gasAccountCost?.balance_is_enough) {
      return [
        t('page.signFooterBar.gasAccount.notEnough'),
        t('page.signFooterBar.gasAccount.deposit'),
      ];
    }
    return [null, null];
  }, [isGasAccountLogin, isWalletConnect, gasAccountCost]);

  useEffect(() => {
    return () => {
      setTipPopupVisible(false);
    };
  }, []);

  if (
    !isWalletConnect &&
    isGasAccountLogin &&
    gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support
  ) {
    return null;
  }

  return (
    <div className="security-level-tip bg-r-neutral-card2 text-r-neutral-card2 mt-[15px] items-center">
      <RcIconGasAccountCC
        viewBox="0 0 20 20"
        className="w-16 h-16 mr-4 text-r-neutral-foot"
      />
      <span className="relative flex-1 text-r-neutral-title1 inline-flex gap-4 items-center">
        {tip}
      </span>

      {btnText ? (
        <Button
          type="primary"
          className="h-[28px] w-[72px] flex justify-center items-center text-[12px] font-medium"
          onClick={() => setTipPopupVisible(true)}
        >
          {btnText}
        </Button>
      ) : null}

      <GasAccountDepositTipPopup
        visible={
          !isWalletConnect && isGasAccountLogin ? tipPopupVisible : false
        }
        onClose={() => setTipPopupVisible(false)}
      />
      <GasAccountLogInTipPopup
        visible={
          !isWalletConnect && !isGasAccountLogin ? tipPopupVisible : false
        }
        onClose={() => setTipPopupVisible(false)}
      />
    </div>
  );
}
