import { Account } from '@/background/service/preference';
import { ReactComponent as RcIconCheckedCC } from '@/ui/assets/icon-checked-cc.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { Chain } from '@debank/common';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import clsx from 'clsx';
import { EVENTS, KEYRING_CLASS } from 'consts';
import React, { ReactNode } from 'react';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import { Props as ActionGroupProps } from '../FooterBar/ActionGroup';
import { GasLessConfig } from '../FooterBar/GasLessComponents';
import { ProcessActions } from '../FooterBar/ProcessActions';
import { Dots } from '../Popup/Dots';
import { BatchSignTxTaskType } from './useBatchSignTxTask';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { isLedgerLockError } from '@/ui/utils/ledger';
import eventBus from '@/eventBus';
import { Popup } from '@/ui/component';
import { useTranslation } from 'react-i18next';
import { Ledger } from '../../../CommonPopup/Ledger';
import { useMemoizedFn } from 'ahooks';
import { DrawerProps } from 'antd';

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
  getContainer?: DrawerProps['getContainer'];
}

export const MiniLedgerAction: React.FC<Props> = ({
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
  onSubmit,
  getContainer,
  ...props
}) => {
  const { isDarkTheme } = useThemeMode();
  const { txStatus, total, currentActiveIndex: current } = task;

  const { status } = useLedgerStatus();
  const [
    visibleLedgerConnectModal,
    setVisibleLedgerConnectModal,
  ] = React.useState(false);

  React.useEffect(() => {
    const listener = (msg) => {
      if (isLedgerLockError(msg) || msg === 'DISCONNECTED') {
        setVisibleLedgerConnectModal(true);
        task.stop();

        // if (msg !== 'DISCONNECTED') {
        //   task.addRevokeTask(task.currentApprovalRef.current!, 1);
        // }
      }
    };

    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);

    return () => {
      eventBus.removeEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);
    };
  }, []);

  const handleSubmit = useMemoizedFn(() => {
    if (status === 'DISCONNECTED') {
      setVisibleLedgerConnectModal(true);
      return;
    }
    onSubmit();
  });

  React.useEffect(() => {
    if (task.status === 'active' && status === 'DISCONNECTED') {
      eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, 'DISCONNECTED');
    }
  }, [task.status, status]);
  const { t } = useTranslation();

  return (
    <>
      <Popup
        height={320}
        visible={visibleLedgerConnectModal}
        closable
        onCancel={() => setVisibleLedgerConnectModal(false)}
        title={t('page.dashboard.hd.ledgerIsDisconnected')}
        maskStyle={{
          backgroundColor: 'transparent',
        }}
        getContainer={getContainer}
      >
        <Ledger isModalContent />
      </Popup>

      {task.status === 'idle' ? (
        <>
          <ProcessActions
            account={account}
            gasLess={useGasLess}
            {...props}
            onSubmit={handleSubmit}
          >
            <div className="flex items-center gap-[8px] justify-center">
              <LedgerSVG width={22} height={22} viewBox="0 0 28 28" />
              {t('page.miniSignFooterBar.signWithLedger')}
            </div>
          </ProcessActions>

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
      ) : current + 1 === total && txStatus === 'signed' ? (
        <div className="rounded-[6px] bg-r-neutral-card2 p-[14px] text-r-neutral-body text-[16px] leading-[20px] font-medium text-center">
          {t('page.miniSignFooterBar.status.txSigned')} <Dots />
        </div>
      ) : (
        <div className="rounded-[6px] bg-r-neutral-card2 p-[14px] text-r-neutral-body text-[16px] leading-[20px] font-medium text-center">
          {total > 1 ? (
            <>
              {t('page.miniSignFooterBar.status.txSendings', {
                current: current + 1,
                total: total,
              })}
              <Dots />
            </>
          ) : (
            <>
              {t('page.miniSignFooterBar.status.txSending')} <Dots />
            </>
          )}
        </div>
      )}
    </>
  );
};
