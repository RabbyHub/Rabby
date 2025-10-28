import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const GasAccountDepositButton = ({
  canUseDirectSubmitTx,
  disabled,
  onDirectSubmit,
  onSignPage,
  loading,
}: {
  canUseDirectSubmitTx: boolean;
  disabled: boolean;
  onDirectSubmit: () => void;
  onSignPage: () => void;
  loading?: boolean;
}) => {
  const currentAccount = useCurrentAccount();
  const { t } = useTranslation();

  return canUseDirectSubmitTx && currentAccount?.type ? (
    <DirectSignToConfirmBtn
      title={t('page.gasAccount.depositPopup.title')}
      onConfirm={onDirectSubmit}
      disabled={disabled}
      overwriteDisabled
      accountType={currentAccount.type}
      loading={loading}
    />
  ) : (
    <Button
      onClick={onSignPage}
      block
      size="large"
      type="primary"
      className="h-[48px] text-r-neutral-title2 text-15 font-medium"
      disabled={disabled}
    >
      {t('page.gasAccount.depositPopup.title')}
    </Button>
  );
};
