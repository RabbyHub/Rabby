import { DirectSubmitProvider } from '@/ui/hooks/useMiniApprovalDirectSign';
import React from 'react';
import { GasAccountDepositTokenForm } from './GasAccountDepositTokenForm';
import { GasAccountTopUpWaitCallback } from './topUpContinuation';
import { useGasAccountDepositFlowRuntimeGuard } from '../hooks/runtime';
import { DrawerProps } from 'antd';
import { getUiType } from '@/ui/utils';

const { isTab, isDesktop } = getUiType();

const defaultGetContainer =
  isTab || isDesktop ? '.js-rabby-popup-container' : undefined;

interface GasAccountDepositPopupProps {
  visible?: boolean;
  onCancel?(): void;
  onClose?(): void;
  onDeposit?(): Promise<void> | void;
  onWaitDepositResult?: GasAccountTopUpWaitCallback;
  minDepositPrice?: number;
  disableDirectDeposit?: boolean;
  maxAccountCount?: number;
  getContainer?: DrawerProps['getContainer'];
}

export const GasAccountDepositPopup: React.FC<GasAccountDepositPopupProps> = ({
  visible,
  onCancel,
  onClose,
  onDeposit,
  onWaitDepositResult,
  minDepositPrice,
  disableDirectDeposit,
  maxAccountCount,
  getContainer,
}) => {
  const handleClose = onCancel || onClose;
  const resolvedGetContainer = getContainer ?? defaultGetContainer;

  useGasAccountDepositFlowRuntimeGuard(visible);

  return (
    <DirectSubmitProvider>
      <GasAccountDepositTokenForm
        visible={visible}
        onClose={handleClose}
        onDeposit={onDeposit}
        onWaitDepositResult={onWaitDepositResult}
        minDepositPrice={minDepositPrice}
        disableDirectDeposit={disableDirectDeposit}
        maxAccountCount={maxAccountCount}
        getContainer={resolvedGetContainer}
      />
    </DirectSubmitProvider>
  );
};
