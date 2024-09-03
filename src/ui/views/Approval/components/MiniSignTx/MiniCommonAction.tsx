import { Account } from '@/background/service/preference';
import { ReactComponent as RcIconCheckedCC } from '@/ui/assets/icon-checked-cc.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { Chain } from '@debank/common';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import clsx from 'clsx';
import { KEYRING_CLASS } from 'consts';
import React, { ReactNode } from 'react';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import {
  ActionGroup,
  Props as ActionGroupProps,
} from '../FooterBar/ActionGroup';
import { GasLessConfig } from '../FooterBar/GasLessComponents';
import { ProcessActions } from '../FooterBar/ProcessActions';
import { Dots } from '../Popup/Dots';
import { BatchSignTxTaskType } from './useBatchSignTxTask';
import { useTranslation } from 'react-i18next';

interface Props extends ActionGroupProps {
  chain?: Chain;
  gnosisAccount?: Account;
  securityLevel?: Level;
  origin?: string;
  originLogo?: string;
  hasUnProcessSecurityResult?: boolean;
  hasShadow?: boolean;
  isTestnet?: boolean;
  engineResults?: Result[];
  useGasLess?: boolean;
  showGasLess?: boolean;
  enableGasLess?: () => void;
  canUseGasLess?: boolean;
  Header?: React.ReactNode;
  Main?: React.ReactNode;
  gasLessFailedReason?: string;
  isWatchAddr?: boolean;
  gasLessConfig?: GasLessConfig;
  isGasNotEnough?: boolean;
  task: BatchSignTxTaskType;
  footer?: ReactNode;
}

export const MiniCommonAction: React.FC<Props> = ({
  origin,
  originLogo,
  gnosisAccount,
  securityLevel,
  engineResults = [],
  hasUnProcessSecurityResult,
  hasShadow = false,
  showGasLess = false,
  useGasLess = false,
  canUseGasLess = false,
  enableGasLess,
  Header,
  Main,
  gasLessFailedReason,
  isWatchAddr,
  gasLessConfig,
  task,
  account,
  footer,
  ...props
}) => {
  const { isDarkTheme } = useThemeMode();
  const { t } = useTranslation();
  return (
    <>
      {task.status === 'idle' ? (
        <>
          {account.type === KEYRING_CLASS.HARDWARE.LEDGER ? (
            <ProcessActions
              account={account}
              gasLess={useGasLess}
              {...props}
              disabledProcess={useGasLess ? false : props.disabledProcess}
              enableTooltip={useGasLess ? false : props.enableTooltip}
              gasLessThemeColor={
                isDarkTheme
                  ? gasLessConfig?.dark_color
                  : gasLessConfig?.theme_color
              }
            >
              <div className="flex items-center gap-[8px] justify-center">
                <LedgerSVG />
                Sign with Ledger
              </div>
            </ProcessActions>
          ) : (
            <ActionGroup
              account={account}
              gasLess={useGasLess}
              {...props}
              disabledProcess={useGasLess ? false : props.disabledProcess}
              enableTooltip={useGasLess ? false : props.enableTooltip}
              gasLessThemeColor={
                isDarkTheme
                  ? gasLessConfig?.dark_color
                  : gasLessConfig?.theme_color
              }
            />
          )}
          {footer}
        </>
      ) : task.status === 'completed' ? (
        <>
          <div
            className={clsx(
              'rounded-[6px] bg-r-green-light p-[14px] text-r-green-default text-[16px] leading-[20px] font-medium',
              'flex items-center justify-center gap-[8px]'
            )}
          >
            <RcIconCheckedCC
              viewBox="0 0 20 20"
              className="text-r-green-default w-[16px] h-[16px]"
            />
            {t('page.miniSignFooterBar.status.txCreated')}
          </div>
        </>
      ) : (
        <div className="rounded-[6px] bg-r-neutral-card2 p-[14px] text-r-neutral-body text-[16px] leading-[20px] font-medium text-center">
          {t('page.miniSignFooterBar.status.txSigned')}
          <Dots />
        </div>
      )}
    </>
  );
};
