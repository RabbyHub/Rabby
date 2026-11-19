import { Modal } from '@/ui/component';
import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';
import styles from './VerifyAddressModal.module.css';

const NoIcon = () => null;

export const ClaimRabbyVerifyModal = ({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <Modal
      className={styles.styledModal}
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={NoIcon}
    >
      <Inner onCancel={onCancel} onConfirm={onConfirm} />
    </Modal>
  );
};

const Inner = ({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-[360px] bg-r-neutral-bg-1 p-[20px] pb-[24px] rounded-[8px] leading-[normal]">
      <div className="text-r-neutral-title1 text-[20px] font-medium text-center">
        {t('page.rabbyPoints.referralCode.verifyAddressModal.verify-address')}
      </div>
      <div className="mt-[12px] text-[15px]  text-r-neutral-body">
        {t(
          'page.rabbyPoints.referralCode.verifyAddressModal.please-sign-this-text-message-to-verify-that-you-are-the-owner-of-this-address'
        )}
      </div>
      <div className="mt-[48px]  flex justify-center items-center gap-16">
        <Button
          type="ghost"
          onClick={onCancel}
          className={clsx(
            'flex-1 h-[44px] text-[15px] font-medium border-blue-light text-r-blue-default',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'before:content-none'
          )}
        >
          {t('page.rabbyPoints.referralCode.verifyAddressModal.cancel')}
        </Button>
        <Button
          type="primary"
          className="flex-1 h-[44px] text-[15px] font-medium text-r-neutral-title2"
          onClick={onConfirm}
        >
          {t('page.rabbyPoints.referralCode.verifyAddressModal.sign')}
        </Button>
      </div>
    </div>
  );
};
