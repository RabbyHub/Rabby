import React from 'react';
import { ReactComponent as RcIconGas } from '@/ui/assets/sign/tx/gas-cc.svg';
import { ReactComponent as RcIconGasAccountCC } from '@/ui/assets/sign/tx/gas-account-blur-cc.svg';

import GasLessBg from '@/ui/assets/sign/tx/bg.svg';
import { ReactComponent as RcIconLogo } from '@/ui/assets/dashboard/rabby.svg';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ReactComponent as RcIconCCFreeGasBg } from '@/ui/assets/free-gas/bg.svg';

import { useThemeMode } from '@/ui/hooks/usePreference';
import { GasAccountCheckResult } from '@/background/service/openapi';
import { Button } from 'antd';
import { useHistory } from 'react-router-dom';
import { useWallet } from '@/ui/utils';
import { UI_TYPE } from '@/constant/ui';
import {
  useGasAccountBalance,
  usePendingHardwareGasAccountLogin,
} from '@/ui/views/GasAccount/hooks';
import { formatUsdValue } from '@/ui/utils/number';
import { GAS_ACCOUNT_INSUFFICIENT_TIP } from '@/ui/views/GasAccount/hooks/checkTxs';
import { cn } from '@/ui/utils/cn';
import styles from './GasLessComponents.module.css';

export type GasLessConfig = {
  button_text: string;
  before_click_text: string;
  after_click_text: string;
  logo: string;
  theme_color: string;
  dark_color: string;
};

type GasAccountChangeHandler = () => void | Promise<void>;

type GasAccountDepositNavigationOptions = {
  onRedirectToDeposit?: () => void;
  onOpenGasAccountDeposit?: () => void;
  disableGasAccountDeposit?: boolean;
  preserveApprovalContext?: boolean;
};

type GasLessNotEnoughProps = GasAccountDepositNavigationOptions & {
  onChangeGasAccount?: GasAccountChangeHandler;
  gasAccountCost?: GasAccountCheckResult;
  gasAccountAddress?: string;
  canGotoUseGasAccount?: boolean;
  canDepositUseGasAccount?: boolean;
  directSubmit?: boolean;
  nativeTokenInsufficient?: boolean;
  approvalUiStyle?: boolean;
};

type GasLessAction =
  | {
      type: 'button';
      text: string;
      onClick: () => void;
      loading: boolean;
    }
  | {
      type: 'pill';
      text: string;
      onClick: () => void;
      loading: boolean;
    };

type FreeGasReadyProps = {
  freeGasText?: string;
  color?: string;
  logo?: string;
  directSubmit?: boolean;
};

type GasLessActivityToSignProps = {
  handleFreeGas: () => void;
  gasLessEnable: boolean;
  gasLessConfig?: GasLessConfig;
  directSubmit?: boolean;
};

type GasAccountAction = {
  text: string;
  onClick: () => void;
  loading: boolean;
};

type GasAccountTipsProps = GasAccountDepositNavigationOptions & {
  gasAccountCost?: GasAccountCheckResult;
  gasAccountAddress?: string;
  isWalletConnect?: boolean;
  noCustomRPC?: boolean;
  directSubmit?: boolean;
  onChangeGasAccount?: GasAccountChangeHandler;
  nativeTokenInsufficient?: boolean;
  approvalUiStyle?: boolean;
  pendingHardwareOnly?: boolean;
};

const GAS_ACCOUNT_PILL_STYLE: React.CSSProperties = {
  cursor: 'pointer',
  padding: '7px 8px',
  borderRadius: 6,
  background: 'var(--r-blue-default, #7084FF)',
  boxShadow: '0px 1px 4px 0px rgba(65, 89, 188, 0.33)',
};

const EMPTY_STYLE: React.CSSProperties = {};

const FREE_GAS_READY_BG_STYLE: React.CSSProperties = {
  backgroundImage: `url(${GasLessBg})`,
};

function useOpenGasAccountDeposit({
  onRedirectToDeposit,
  onOpenGasAccountDeposit,
  disableGasAccountDeposit,
  preserveApprovalContext,
}: GasAccountDepositNavigationOptions) {
  const history = useHistory();
  const wallet = useWallet();

  const gotoGasAccount = React.useCallback(async () => {
    onRedirectToDeposit?.();

    const openGasAccountPopup = async () => {
      const opened = await wallet.openGasAccountPopup<boolean>(
        preserveApprovalContext ? { clearApprovals: false } : undefined
      );
      if (!opened) {
        history.push('/gas-account');
      }
    };

    if (UI_TYPE.isPop) {
      history.push('/gas-account');
    } else {
      void openGasAccountPopup();
      if (UI_TYPE.isNotification) {
        window.close();
      }
    }
  }, [history, onRedirectToDeposit, preserveApprovalContext, wallet]);

  return React.useCallback(() => {
    if (disableGasAccountDeposit) {
      return;
    }

    if (onOpenGasAccountDeposit) {
      onOpenGasAccountDeposit();
      return;
    }

    void gotoGasAccount();
  }, [disableGasAccountDeposit, gotoGasAccount, onOpenGasAccountDeposit]);
}

export function GasLessNotEnough({
  onChangeGasAccount,
  gasAccountCost,
  gasAccountAddress,
  canGotoUseGasAccount,
  canDepositUseGasAccount,
  directSubmit,
  onRedirectToDeposit,
  onOpenGasAccountDeposit,
  disableGasAccountDeposit,
  preserveApprovalContext,
  nativeTokenInsufficient,
  approvalUiStyle,
}: GasLessNotEnoughProps) {
  const { t } = useTranslation();
  const gasAccountBalance = useGasAccountBalance(gasAccountAddress);
  const openDeposit = useOpenGasAccountDeposit({
    onRedirectToDeposit,
    onOpenGasAccountDeposit,
    disableGasAccountDeposit,
    preserveApprovalContext,
  });

  const {
    shouldSignWithPendingHardware,
    isCheckingPendingHardwareGasAccount,
  } = usePendingHardwareGasAccountLogin({
    enabled: !!nativeTokenInsufficient,
    gasAccountCost,
    currentGasAccountAddress: gasAccountAddress,
    onLoggedIn: onChangeGasAccount,
  });

  if (isCheckingPendingHardwareGasAccount) {
    return null;
  }

  if (shouldSignWithPendingHardware) {
    return null;
  }

  const notEnoughTip = t('page.signFooterBar.gasAccount.notEnough', {
    usd: formatUsdValue(gasAccountBalance),
  });

  let action: GasLessAction | null = null;
  if (canDepositUseGasAccount && !disableGasAccountDeposit) {
    action = {
      type: 'button',
      text: t('page.signFooterBar.gasAccount.deposit'),
      onClick: openDeposit,
      loading: false,
    };
  } else if (canGotoUseGasAccount) {
    action = {
      type: 'pill',
      text: t('page.signFooterBar.gasAccount.useGasAccount'),
      onClick: () => {
        void onChangeGasAccount?.();
      },
      loading: false,
    };
  }

  const tipText = canDepositUseGasAccount
    ? notEnoughTip
    : t('page.signFooterBar.gasless.notEnough');

  const showApprovalUiStyle = !!approvalUiStyle;

  return (
    <div
      className={clsx(
        'security-level-tip items-center',
        showApprovalUiStyle
          ? 'mt-8 min-h-[40px] bg-r-red-light text-r-red-light pl-[10px] pr-8 py-6'
          : directSubmit
          ? 'mt-8 bg-r-red-light border border-solid border-rabby-red-default text-r-neutral-card2'
          : 'mt-[15px] bg-r-neutral-card2 text-r-neutral-card2'
      )}
    >
      {(showApprovalUiStyle || !directSubmit) && (
        <RcIconGas
          viewBox="0 0 16 16"
          className={clsx(
            'w-16 h-16 shrink-0',
            showApprovalUiStyle
              ? 'mr-6 text-r-red-default'
              : 'mr-4 text-r-neutral-title-1'
          )}
        />
      )}
      <div
        className={clsx(
          'relative flex-1 min-w-0',
          showApprovalUiStyle
            ? 'text-12 leading-[16px] text-r-red-default'
            : directSubmit
            ? 'text-r-red-default'
            : 'text-r-neutral-title1'
        )}
      >
        <span className="block break-words">{tipText}</span>
      </div>

      {action?.type === 'button' ? (
        <Button
          loading={action.loading}
          type="primary"
          className={clsx(
            'h-[28px] min-w-[72px] px-10 flex justify-center items-center text-[12px] font-medium',
            showApprovalUiStyle && 'rounded-[6px] shadow-none'
          )}
          onClick={action.onClick}
        >
          {action.text}
        </Button>
      ) : null}

      {action?.type === 'pill' ? (
        <div
          style={GAS_ACCOUNT_PILL_STYLE}
          className="text-r-neutral-title2"
          onClick={action.onClick}
        >
          {action.text}
        </div>
      ) : null}
    </div>
  );
}

function FreeGasReady({
  freeGasText,
  color,
  logo,
  directSubmit,
}: FreeGasReadyProps) {
  const { t } = useTranslation();
  return (
    <span
      className={clsx(
        'gas-ready security-level-tip text-transparent',
        directSubmit
          ? 'mt-8 bg-r-blue-light-1 border border-solid border-rabby-blue-default h-[40px]'
          : 'bg-transparent py-0 pt-[18px] h-[46px]'
      )}
      style={
        freeGasText || directSubmit ? EMPTY_STYLE : FREE_GAS_READY_BG_STYLE
      }
    >
      {logo ? (
        <img src={logo} className="w-16 h-16 mr-4" alt="" />
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
  directSubmit,
}: GasLessActivityToSignProps) {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  const themeColor = gasLessConfig
    ? (isDarkTheme ? gasLessConfig.dark_color : gasLessConfig.theme_color) ||
      'var(--r-blue-default, #7084FF)'
    : undefined;

  return (
    <div
      className={cn(
        styles.gasLessReady,
        gasLessEnable && 'gasLess',
        directSubmit && 'direct-submit'
      )}
    >
      <FreeGasReady
        directSubmit={directSubmit}
        freeGasText={gasLessConfig?.after_click_text}
        color={themeColor}
        logo={gasLessConfig?.logo}
      />
      {themeColor && !directSubmit && (
        <RcIconCCFreeGasBg
          style={{
            color: themeColor,
          }}
          className="h-[45px] w-full absolute top-[7px]"
        />
      )}
      <span
        className={clsx(
          'gas-to-sign security-level-tip  items-center ',
          !directSubmit && 'pr-6',
          directSubmit
            ? 'mt-8 rounded-[8px] border border-solid bg-r-red-light border-rabby-red-default'
            : themeColor
            ? 'bg-transparent text-transparent'
            : 'bg-r-neutral-card2 text-r-neutral-card2'
        )}
      >
        {gasLessConfig?.logo ? (
          <img src={gasLessConfig.logo} className="w-16 h-16 mr-4" alt="" />
        ) : (
          !directSubmit && (
            <RcIconGas
              viewBox="0 0 16 16"
              className="w-16 h-16 mr-4 text-r-neutral-title-1"
            />
          )
        )}

        <span
          className={clsx(
            'flex-1',
            themeColor ? '' : 'text-r-neutral-title-1',
            directSubmit && 'text-r-red-default'
          )}
          style={{
            color: directSubmit ? undefined : themeColor,
          }}
        >
          {gasLessConfig?.before_click_text ||
            t('page.signFooterBar.gasless.notEnough')}
        </span>

        <span
          className={cn(
            styles.linearGradientAnimatedSpan,
            'mr-auto px-10 py-[7px]  cursor-pointer text-r-neutral-title-2'
          )}
          style={{
            background: themeColor,
          }}
          onClick={handleFreeGas}
        >
          {gasLessConfig?.button_text ||
            t('page.signFooterBar.gasless.GetFreeGasToSign')}
        </span>
      </span>
    </div>
  );
}

export const GasLessAnimatedWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn(styles.gasLessAnimatedWrapper, className)}
    {...rest}
  />
));

export function GasAccountTips({
  gasAccountCost,
  gasAccountAddress,
  isWalletConnect,
  noCustomRPC,
  directSubmit,
  onRedirectToDeposit,
  onOpenGasAccountDeposit,
  disableGasAccountDeposit,
  onChangeGasAccount,
  preserveApprovalContext,
  nativeTokenInsufficient,
  approvalUiStyle,
  pendingHardwareOnly,
}: GasAccountTipsProps) {
  const { t } = useTranslation();
  const gasAccountBalance = useGasAccountBalance(gasAccountAddress);
  const openDeposit = useOpenGasAccountDeposit({
    onRedirectToDeposit,
    onOpenGasAccountDeposit,
    disableGasAccountDeposit,
    preserveApprovalContext,
  });

  const {
    shouldSignWithPendingHardware,
    pendingHardwareAddressBrandName,
    isCheckingPendingHardwareGasAccount,
    isLoggingPendingHardware,
    handleSignWithPendingHardware,
  } = usePendingHardwareGasAccountLogin({
    enabled: !!nativeTokenInsufficient,
    gasAccountCost,
    currentGasAccountAddress: gasAccountAddress,
    onLoggedIn: onChangeGasAccount,
  });

  if (isCheckingPendingHardwareGasAccount) {
    return null;
  }

  if (pendingHardwareOnly && !shouldSignWithPendingHardware) {
    return null;
  }

  const notEnoughTipText = t('page.signFooterBar.gasAccount.notEnough', {
    usd: formatUsdValue(gasAccountBalance),
  });

  const depositAction: GasAccountAction | null = disableGasAccountDeposit
    ? null
    : {
        text: t('page.signFooterBar.gasAccount.deposit'),
        onClick: openDeposit,
        loading: false,
      };

  let finalTip: string | null = null;
  let action: GasAccountAction | null = null;
  let isPendingHardware = false;

  if (!noCustomRPC) {
    finalTip = t('page.signFooterBar.gasAccount.customRPC');
  } else if (isWalletConnect) {
    finalTip = t('page.signFooterBar.gasAccount.WalletConnectTips');
  } else if (shouldSignWithPendingHardware) {
    finalTip = t('page.signFooterBar.gasAccount.signWithHardwareWalletToUse', {
      brand: pendingHardwareAddressBrandName,
    });
    action = {
      text: t('page.signFooterBar.signAndSubmitButton'),
      onClick: () => {
        void handleSignWithPendingHardware();
      },
      loading: isLoggingPendingHardware,
    };
    isPendingHardware = true;
  } else if (gasAccountCost?.err_msg) {
    const isInsufficientError =
      !gasAccountCost.chain_not_support &&
      gasAccountCost.err_msg.toLowerCase() ===
        GAS_ACCOUNT_INSUFFICIENT_TIP.toLowerCase();
    if (isInsufficientError) {
      finalTip = notEnoughTipText;
      action = depositAction;
    } else {
      finalTip = gasAccountCost.err_msg;
    }
  } else if (gasAccountCost?.chain_not_support) {
    finalTip = t('page.signFooterBar.gasAccount.chainNotSupported');
  } else if (gasAccountCost && !gasAccountCost.balance_is_enough) {
    finalTip = notEnoughTipText;
    action = depositAction;
  }

  if (
    !isWalletConnect &&
    gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support &&
    noCustomRPC &&
    !gasAccountCost?.err_msg &&
    !shouldSignWithPendingHardware
  ) {
    return null;
  }

  if (!finalTip) {
    return null;
  }

  const showApprovalUiStyle = !!approvalUiStyle;

  return (
    <div
      className={clsx(
        'security-level-tip items-center',
        isPendingHardware
          ? 'mt-8 bg-r-neutral-line p-8 text-r-neutral-line'
          : showApprovalUiStyle
          ? 'mt-8 min-h-[40px] pl-[10px] pr-8 py-6 bg-r-red-light text-r-red-light'
          : directSubmit
          ? 'mt-8 bg-r-red-light border border-solid border-rabby-red-default min-h-[42px] text-r-red-light'
          : 'mt-[15px] bg-r-neutral-card2 text-r-neutral-card2'
      )}
    >
      {!isPendingHardware && (showApprovalUiStyle || !directSubmit) && (
        <RcIconGasAccountCC
          viewBox="0 0 20 20"
          className={clsx(
            'w-16 h-16 shrink-0',
            showApprovalUiStyle
              ? 'mr-6 text-r-red-default'
              : 'mr-4 text-r-neutral-foot'
          )}
        />
      )}
      <div
        className={clsx(
          'relative flex-1 min-w-0',
          isPendingHardware
            ? 'text-r-neutral-title1'
            : showApprovalUiStyle
            ? 'text-12 leading-[16px] text-r-red-default'
            : directSubmit
            ? 'text-r-red-default'
            : 'text-r-neutral-title1'
        )}
      >
        <span className="block break-words">{finalTip}</span>
      </div>

      {action ? (
        <Button
          loading={action.loading}
          type="primary"
          className={clsx(
            'h-[28px] min-w-[72px] px-10 flex justify-center items-center text-[12px] font-medium',
            showApprovalUiStyle && 'rounded-[6px] shadow-none'
          )}
          onClick={action.onClick}
        >
          {action.text}
        </Button>
      ) : null}
    </div>
  );
}
