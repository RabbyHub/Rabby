import { DirectSubmitProvider } from '@/ui/hooks/useMiniApprovalDirectSign';
import React from 'react';
import { GasAccountDepositTokenForm } from './GasAccountDepositTokenForm';
import { GasAccountTopUpWaitCallback } from './topUpContinuation';
import { useGasAccountDepositFlowRuntimeGuard } from '../hooks/runtime';

interface GasAccountDepositPopupProps {
  visible?: boolean;
  onCancel?(): void;
  onClose?(): void;
  onDeposit?(): Promise<void> | void;
  onWaitDepositResult?: GasAccountTopUpWaitCallback;
  minDepositPrice?: number;
  gasAccountAddress?: string;
  disableDirectDeposit?: boolean;
  maxAccountCount?: number;
}

export const GasAccountDepositPopup: React.FC<GasAccountDepositPopupProps> = ({
  visible,
  onCancel,
  onClose,
  onDeposit,
  onWaitDepositResult,
  minDepositPrice,
  gasAccountAddress,
  disableDirectDeposit,
  maxAccountCount,
}) => {
  const handleClose = onCancel || onClose;
  useGasAccountDepositFlowRuntimeGuard(visible);

  return (
    <DirectSubmitProvider>
      <GasAccountDepositTokenForm
        visible={visible}
        onClose={handleClose}
        onDeposit={onDeposit}
        onWaitDepositResult={onWaitDepositResult}
        minDepositPrice={minDepositPrice}
        gasAccountAddress={gasAccountAddress}
        disableDirectDeposit={disableDirectDeposit}
        maxAccountCount={maxAccountCount}
      />
    </DirectSubmitProvider>
  );
};
