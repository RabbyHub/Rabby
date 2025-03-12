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
import { Button, Modal } from 'antd';
import {
  GasAccountDepositTipPopup,
  GasAccountLogInTipPopup,
} from '@/ui/views/GasAccount/components/GasAccountTxPopups';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_CLASS } from '@/constant';
import { useGasAccountMethods } from '@/ui/views/GasAccount/hooks';
import { useCss } from 'react-use';
import { useHistory } from 'react-router-dom';

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
  onChangeGasAccount,
  canGotoUseGasAccount,
}: {
  url?: string;
  gasLessFailedReason?: string;
  onChangeGasAccount?: () => void;
  canGotoUseGasAccount?: boolean;
}) {
  const { t } = useTranslation();
  const [
    hoverGasLessFailedReason,
    setHoverGasLessFailedReason,
  ] = React.useState(false);

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
        {t('page.signFooterBar.gasless.notEnough')}
      </span>

      {canGotoUseGasAccount ? (
        <div
          style={{
            cursor: 'pointer',
            padding: '7px 8px',
            borderRadius: 6,
            background: 'var(--r-blue-default, #7084FF)',
            boxShadow: '0px 1px 4px 0px rgba(65, 89, 188, 0.33)',
          }}
          className="text-r-neutral-title2"
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

  const themeColor = gasLessConfig
    ? (isDarkTheme ? gasLessConfig?.dark_color : gasLessConfig?.theme_color) ||
      'var(--r-blue-default, #7084FF)'
    : undefined;

  return (
    <>
      <GasLessReady className={clsx(gasLessEnable && 'gasLess')}>
        <FreeGasReady
          freeGasText={gasLessConfig?.after_click_text}
          color={themeColor}
          logo={gasLessConfig?.logo}
        />
        {themeColor && (
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
  noCustomRPC,
  miniFooter,
}: {
  gasAccountCost?: GasAccountCheckResult;
  isGasAccountLogin?: boolean;
  isWalletConnect?: boolean;
  noCustomRPC?: boolean;
  miniFooter?: boolean;
}) {
  const { t } = useTranslation();
  const [tipPopupVisible, setTipPopupVisible] = useState(false);

  const { tip, btnText, loginGasAccount, depositGasAccount } = useMemo(() => {
    if (!noCustomRPC) {
      return {
        tip: t('page.signFooterBar.gasAccount.customRPC'),
        btnText: null,
        loginGasAccount: false,
        depositGasAccount: false,
      };
    }

    if (isWalletConnect) {
      return {
        tip: t('page.signFooterBar.gasAccount.WalletConnectTips'),
        btnText: null,
        loginGasAccount: false,
        depositGasAccount: false,
      };
    }

    if (!isGasAccountLogin) {
      return {
        tip: t('page.signFooterBar.gasAccount.loginFirst'),
        btnText: t('page.signFooterBar.gasAccount.login'),
        loginGasAccount: true,
        depositGasAccount: false,
      };
    }

    if (gasAccountCost?.chain_not_support) {
      return {
        tip: t('page.signFooterBar.gasAccount.chainNotSupported'),
        btnText: null,
        loginGasAccount: false,
        depositGasAccount: false,
      };
    }

    if (!gasAccountCost?.balance_is_enough) {
      return {
        tip: t('page.signFooterBar.gasAccount.notEnough'),
        btnText: t('page.signFooterBar.gasAccount.deposit'),
        loginGasAccount: false,
        depositGasAccount: true,
      };
    }

    return {
      tip: null,
      btnText: null,
      loginGasAccount: false,
      depositGasAccount: false,
    };
  }, [isGasAccountLogin, isWalletConnect, gasAccountCost, noCustomRPC, t]);

  const history = useHistory();
  const gotoGasAccount = () => {
    history.push('/gas-account');
  };

  const currentAccount = useCurrentAccount();
  const { login } = useGasAccountMethods();

  const canDirectLogin =
    loginGasAccount &&
    (currentAccount?.type === KEYRING_CLASS.MNEMONIC ||
      currentAccount?.type === KEYRING_CLASS.PRIVATE_KEY);

  useEffect(() => {
    return () => setTipPopupVisible(false);
  }, []);

  const depositCn = useCss({
    '& .ant-modal-content': {
      background: 'var(--r-neutral-bg1, #FFF)',
      borderRadius: '16px',
    },
    '& .ant-modal-confirm-title': {
      color: 'var(--r-neutral-title1, #192945)',
      textAlign: 'center',
      fontSize: '15px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: 'normal',
    },
    '& .ant-modal-body': {
      padding: '24px 16px 20px 16px',
    },
    '& .ant-modal-confirm-content': {
      padding: '4px 0 0 0',
    },
    '& .ant-modal-confirm-btns': {
      justifyContent: 'center',
      '.ant-btn-primary': {
        width: '260px',
        height: '40px',
      },
    },
  });

  const modalConfirm = React.useCallback(
    (type: 'login' | 'deposit') => {
      const isLogin = type === 'login';
      const title = isLogin
        ? t('page.signFooterBar.gasAccount.loginTips')
        : t('page.signFooterBar.gasAccount.depositTips');
      Modal.confirm({
        width: 320,
        closable: false,
        centered: true,
        className: depositCn,
        title: t('page.signFooterBar.gasAccount.depositTips'),
        content: null,
        cancelButtonProps: {
          ghost: true,
          className: clsx(
            'h-[40px] border-blue-light text-blue-light',
            'hover:bg-r-blue-light1 active:bg-[#0000001A]',
            'rounded-[6px]',
            'before:content-none',
            'flex items-center justify-center'
          ),
        },
        cancelText: t('global.Cancel'),
        okText: t('global.Confirm'),
        onOk() {
          if (isLogin && currentAccount) {
            login(currentAccount);
          } else {
            gotoGasAccount();
          }
        },
      });
    },
    [t, depositCn, login, gotoGasAccount]
  );

  if (
    !isWalletConnect &&
    isGasAccountLogin &&
    gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support &&
    noCustomRPC
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
          onClick={() => {
            if (canDirectLogin) {
              login(currentAccount);
            } else if (loginGasAccount) {
              modalConfirm('login');
            } else if (miniFooter && depositGasAccount) {
              modalConfirm('deposit');
            } else {
              setTipPopupVisible(true);
            }
          }}
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
