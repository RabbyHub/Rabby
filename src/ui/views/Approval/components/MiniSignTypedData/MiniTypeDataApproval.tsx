import { Popup } from '@/ui/component';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import {
  useDirectSigning,
  useSetDirectSigning,
  useResetDirectSignState,
  supportedHardwareDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { DrawerProps, Modal } from 'antd';
import React, { useState, useEffect, useCallback } from 'react';
import { BatchSignTypedDataTaskType, MiniTypedData } from './useTypedDataTask';
import { MiniSignTypedDate } from './index';
import { ReactComponent as RCIconLoadingCC } from '@/ui/assets/loading-cc.svg';
import { Account } from '@/background/service/preference';

export const MiniTypedDataApproval = ({
  txs,
  visible,
  onClose,
  onResolve,
  onReject,
  onPreExecError,
  //   ga,
  getContainer,
  directSubmit,
  canUseDirectSubmitTx,
  isPreparingSign,
  setIsPreparingSign,
  noShowModalLoading,
  account,
}: {
  txs?: MiniTypedData[];
  visible?: boolean;
  onClose?: () => void;
  onReject?: () => void;
  onResolve?: (hash: string[]) => void;
  onPreExecError?: () => void;
  //   ga?: Record<string, any>;
  getContainer?: DrawerProps['getContainer'];
  directSubmit?: boolean;
  canUseDirectSubmitTx?: boolean;
  isPreparingSign?: boolean;
  setIsPreparingSign?: (isPreparingSign: boolean) => void;
  noShowModalLoading?: boolean;
  account?: Account;
}) => {
  const [status, setStatus] = useState<BatchSignTypedDataTaskType['status']>(
    'idle'
  );
  const { isDarkTheme } = useThemeMode();
  const _currentAccount = useCurrentAccount();
  const currentAccount = account || _currentAccount;

  const isSigningLoading = useDirectSigning();
  const setDirectSigning = useSetDirectSigning();

  const resetDirectSigning = useResetDirectSignState();

  const [innerVisible, setInnerVisible] = useState(false);

  useEffect(() => {
    resetDirectSigning();
    setInnerVisible(false);
  }, [txs]);

  useEffect(() => {
    if (visible) {
      setStatus('idle');
    }
  }, [visible]);

  useEffect(() => {
    if (innerVisible) {
      setStatus('idle');
    }
  }, [innerVisible]);

  useEffect(() => {
    if (
      supportedHardwareDirectSign(currentAccount?.type || '') &&
      isSigningLoading
    ) {
      setInnerVisible(true);
    } else {
      setInnerVisible(false);
    }
  }, [currentAccount?.type, isSigningLoading]);

  const handleClose = useCallback(() => {
    onClose?.();
    setInnerVisible(false);
    setDirectSigning(false);
    setIsPreparingSign?.(false);
  }, [onClose]);

  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((e) => e + 1);
  }, [txs]);

  return (
    <>
      <Popup
        placement="bottom"
        height="fit-content"
        className="is-support-darkmode"
        visible={innerVisible}
        onClose={handleClose}
        maskClosable={status === 'idle'}
        closable={false}
        bodyStyle={{
          padding: 0,
          // maxHeight: 160,
        }}
        push={false}
        forceRender
        destroyOnClose={false}
        maskStyle={{
          backgroundColor: !isDarkTheme ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
        }}
        getContainer={getContainer}
        key={`${currentAccount?.address}-${currentAccount?.type}`}
      >
        {txs?.length ? (
          <MiniSignTypedDate
            key={key}
            directSubmit={directSubmit}
            // ga={ga}
            txs={txs}
            onStatusChange={(status) => {
              setStatus(status);
            }}
            onPreExecError={onPreExecError}
            onReject={onReject}
            onResolve={onResolve}
            getContainer={getContainer}
            account={currentAccount || undefined}
          />
        ) : null}
      </Popup>

      {isPreparingSign ||
      (directSubmit &&
        canUseDirectSubmitTx &&
        !noShowModalLoading &&
        !supportedHardwareDirectSign(currentAccount?.type || '')) ? (
        <Modal
          transitionName=""
          visible={isSigningLoading || isPreparingSign}
          maskClosable={false}
          centered
          cancelText={null}
          okText={null}
          footer={null}
          width={'auto'}
          closable={false}
          bodyStyle={{ padding: 0 }}
        >
          <div className="w-[52px] h-[52px] p-[14px] flex items-center justify-center">
            <RCIconLoadingCC className="text-r-neutral-body animate-spin" />
          </div>
        </Modal>
      ) : null}
    </>
  );
};

// [
//   {
//     data: JSON.parse(v3),
//     from: address,
//     version: 'V3',
//   },
//   {
//     data: JSON.parse(v4),
//     from: address,
//     version: 'V4',
//   },
// ];

// <MiniTypedDataApproval
//   txs={txs}
//   onResolve={(txs) => {
//     console.log('txs', txs);
//     setTxs(undefined);
//   }}
//   onReject={() => {
//     console.log('rejected');
//     setTxs(undefined);
//   }}
//   getContainer={getContainer}
//   directSubmit
//   canUseDirectSubmitTx
// />
