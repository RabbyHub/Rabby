import React, { useEffect, useState } from 'react';
import { Modal } from '@/ui/component';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import clsx from 'clsx';
import { GasACcountCurrentAddress } from './LoginPopup';
import { useRabbySelector } from '@/ui/store';

export const SwitchLoginAddrBeforeDepositModal = ({
  className,
  onCancel,
  visible,
}: {
  visible: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const gasAccount = useRabbySelector((s) => s.gasAccount.account);

  return (
    <Modal
      visible={visible}
      width={320}
      cancelText={null}
      okText={null}
      footer={null}
      onCancel={onCancel}
      closable={false}
      className={clsx('modal-support-darkmode', className)}
      bodyStyle={{
        paddingLeft: 20,
        paddingRight: 20,
      }}
      focusTriggerAfterClose={false}
    >
      <div className="flex flex-col items-center">
        <div className="text-18 font-medium text-r-neutral-title1">
          {t('page.gasAccount.switchLoginAddressBeforeDeposit.title')}
        </div>
        <div className="mt-12 mb-20 text-14 text-r-neutral-body">
          {t('page.gasAccount.switchLoginAddressBeforeDeposit.desc')}
        </div>
        <div className="mb-12">
          <GasACcountCurrentAddress account={gasAccount} />
        </div>

        <Button
          type="primary"
          className="mt-auto w-full h-40 text-15 font-medium"
          onClick={onCancel}
        >
          {t('global.ok')}
        </Button>
      </div>
    </Modal>
  );
};
