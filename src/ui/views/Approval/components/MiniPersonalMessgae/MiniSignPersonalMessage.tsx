import { Popup } from '@/ui/component';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import {
  useDirectSigning,
  useSetDirectSigning,
  useResetDirectSignState,
  useGetDisableProcessDirectSign,
  supportedHardwareDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { DrawerProps, Modal } from 'antd';
import React, {
  useState,
  useEffect,
  useCallback,
  ComponentPropsWithoutRef,
} from 'react';
import { ReactComponent as RCIconLoadingCC } from '@/ui/assets/loading-cc.svg';
import {
  BatchSignPersonalMessageTaskType,
  MiniPersonalMessage,
} from './useBatchPersonalMessageTask';
import { MiniSignPersonalMessage } from '.';
import {
  wrapModalPromise,
  wrapPromise,
} from '@/ui/component/Modal/WrapPromise';
import ReactDOM from 'react-dom';
import { wrapPromiseOnPortal } from '@/ui/component/PortalHost/wrapPromiseOnPortalHost';
import { Account } from '@/background/service/preference';
import { transform } from 'lodash';

export const MiniPersonalMessageApproval = ({
  txs,
  visible,
  onClose,
  onResolve,
  onReject,
  //   ga,
  getContainer,
  directSubmit,
  canUseDirectSubmitTx,
  isPreparingSign,
  setIsPreparingSign,
  account,
  autoSign,
}: {
  txs?: MiniPersonalMessage[];
  visible?: boolean;
  onClose?: () => void;
  onReject?: () => void;
  onResolve?: (hash: string[]) => void;
  getContainer?: DrawerProps['getContainer'];
  directSubmit?: boolean;
  canUseDirectSubmitTx?: boolean;
  isPreparingSign?: boolean;
  setIsPreparingSign?: (isPreparingSign: boolean) => void;
  account?: Account;
  autoSign?: boolean;
}) => {
  const [status, setStatus] = useState<
    BatchSignPersonalMessageTaskType['status']
  >('idle');
  const { isDarkTheme } = useThemeMode();
  const currentAccount = useCurrentAccount();

  const isSigningLoading = useDirectSigning();
  const setDirectSigning = useSetDirectSigning();

  const resetDirectSigning = useResetDirectSignState();
  const disabledProcess = useGetDisableProcessDirectSign();

  const [innerVisible, setInnerVisible] = useState(false);

  useEffect(() => {
    if (isSigningLoading && disabledProcess) {
      setDirectSigning(false);
      setIsPreparingSign?.(false);
      setInnerVisible(false);
    }
  }, [isSigningLoading, disabledProcess, setDirectSigning]);

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

  console.log('txs?.length', txs, {
    txs,
    visible,
    onClose,
    onResolve,
    onReject,
    //   ga,
    getContainer,
    directSubmit,
    canUseDirectSubmitTx,
    isPreparingSign,
    setIsPreparingSign,
    isSigningLoading,
    disabledProcess,
    see: directSubmit ? innerVisible : visible,
  });

  useEffect(() => {
    if (!isSigningLoading && autoSign && txs) {
      setDirectSigning(true);
    }
  }, [txs, isSigningLoading, autoSign]);

  return (
    <>
      <Popup
        placement="bottom"
        height="fit-content"
        className="is-support-darkmode"
        visible={directSubmit ? innerVisible : visible}
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
        contentWrapperStyle={{
          transform: 'none!important',
        }}
        getContainer={getContainer}
        key={`${currentAccount?.address}-${currentAccount?.type}`}
      >
        {txs?.length ? (
          <MiniSignPersonalMessage
            key={key}
            directSubmit={directSubmit}
            txs={txs}
            onStatusChange={(status) => {
              setStatus(status);
            }}
            onReject={onReject}
            onResolve={onResolve}
            getContainer={getContainer}
            account={account}
          />
        ) : null}
      </Popup>

      {isPreparingSign ||
      (directSubmit &&
        canUseDirectSubmitTx &&
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

export const personalMessagePromise = wrapPromiseOnPortal(
  MiniPersonalMessageApproval,
  {
    rejectProps: ['onClose', 'onReject'],
    resolveProps: ['onResolve'],
  }
);
