import { Account } from '@/background/service/preference';
import { ReactComponent as RcIconCheckedCC } from '@/ui/assets/icon-checked-cc.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { Chain } from '@debank/common';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import clsx from 'clsx';
import { EVENTS } from 'consts';
import React, { ReactNode, useRef } from 'react';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';

import { Props as ActionGroupProps } from '../FooterBar/ActionGroup';
import { GasLessConfig } from '../FooterBar/GasLessComponents';
import { Dots } from '../Popup/Dots';
import { BatchSignTxTaskType } from './useBatchSignTxTask';
import eventBus from '@/eventBus';
import { Popup } from '@/ui/component';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { DrawerProps } from 'antd';
import { useDebounce } from 'react-use';
import {
  useDirectSigning,
  useSetDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { OneKey } from '@/ui/views/CommonPopup/OneKey';
import { ProcessActions } from '../FooterBar/ProcessActions';

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

export const MiniOneKeyAction: React.FC<Props> = ({
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
  isMiniSignTx,
  disabledProcess,
  directSubmit,
  ...props
}) => {
  const { isDarkTheme } = useThemeMode();
  const { txStatus, total, currentActiveIndex: current } = task;

  const [disconnectTipsModal, setDisconnectTipsModal] = React.useState(false);

  React.useEffect(() => {
    const listener = (msg) => {
      if (msg === 'No OneKey Device found') {
        console.log('msgmsg', msg);
        setDisconnectTipsModal(true);
        task.stop();
      }
    };

    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);

    return () => {
      eventBus.removeEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);
    };
  }, []);

  const handleSubmit = useMemoizedFn(() => {
    onSubmit();
  });

  const directSigning = useDirectSigning();
  const setDirectSigning = useSetDirectSigning();
  const autoSigned = useRef(false);

  useDebounce(
    () => {
      if (
        !autoSigned.current &&
        isMiniSignTx &&
        !disabledProcess &&
        directSigning &&
        directSubmit
      ) {
        autoSigned.current = true;
        handleSubmit();
      }
    },
    300,
    [directSigning, disabledProcess, handleSubmit, isMiniSignTx, directSubmit]
  );

  const { t } = useTranslation();

  if (!directSubmit) {
    return (
      <>
        <Popup
          height={320}
          visible={disconnectTipsModal}
          closable
          onCancel={() => {
            setDirectSigning(false);
            setDisconnectTipsModal(false);
            // props.onCancel?.();
          }}
          title={t('page.dashboard.hd.onekeyIsDisconnected')}
          maskStyle={{
            backgroundColor: 'transparent',
          }}
          getContainer={getContainer}
        >
          <OneKey isModalContent />
        </Popup>
        {task.status === 'idle' ? (
          <>
            <ProcessActions
              account={account}
              gasLess={useGasLess}
              disabledProcess={disabledProcess}
              {...props}
              onSubmit={handleSubmit}
            >
              <div className="flex items-center gap-[8px] justify-center">
                <OneKeySVG width={22} height={22} viewBox="0 0 28 28" />
                {t('page.miniSignFooterBar.signWithOneKey')}
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
  }

  return (
    <>
      <Popup
        height={'auto'}
        visible={disconnectTipsModal}
        closable
        onCancel={() => {
          setDirectSigning(false);
          setDisconnectTipsModal(false);
          props.onCancel?.();
        }}
        title={t('page.dashboard.hd.onekeyIsDisconnected')}
        getContainer={getContainer}
      >
        <OneKey isModalContent />
      </Popup>

      {task.status === 'completed' ? (
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
        <div className="rounded-[6px] bg-r-neutral-card2 p-[14px] text-r-neutral-body text-[16px] leading-[20px] font-medium text-center flex items-center justify-center gap-2">
          <OneKeySVG
            width={22}
            height={22}
            viewBox="0 0 28 28"
            className="mr-6"
          />

          {total > 1 ? (
            <div>
              {t('page.miniSignFooterBar.status.txSendings', {
                current: current + 1,
                total: total,
              })}
              <Dots />
            </div>
          ) : (
            <div>
              {t('page.miniSignFooterBar.status.txSending')} <Dots />
            </div>
          )}
        </div>
      )}
    </>
  );
};
