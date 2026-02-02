import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';

const modalStyle = {
  width: 400,
  title: null as React.ReactNode,
  bodyStyle: { background: 'transparent', padding: 0 } as const,
  maskClosable: true,
  footer: null as React.ReactNode,
  zIndex: 1000,
  className: 'modal-support-darkmode',
  closeIcon: ModalCloseIcon,
  centered: true,
  maskStyle: {
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
};

type ManageEmodeModalProps = {
  visible: boolean;
  onCancel: () => void;
  onManageEmode: () => void;
};

export const ManageEmodeModal: React.FC<ManageEmodeModalProps> = ({
  visible,
  onCancel,
  onManageEmode,
}) => {
  const { t } = useTranslation();

  const handleManageEmode = useCallback(() => {
    onCancel();
    onManageEmode();
  }, [onCancel, onManageEmode]);

  return (
    <Modal {...modalStyle} visible={visible} onCancel={onCancel}>
      <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px] flex flex-col items-center">
        <p className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1 text-center">
          {t('page.lending.manageEmode.guide.title')}
        </p>
        <p className="text-[16px] leading-[24px] text-r-neutral-foot text-center mt-[8px] px-[20px]">
          {t('page.lending.manageEmode.guide.description')}
        </p>
        <Button
          type="primary"
          className="w-full mt-[32px] h-[44px] rounded-[8px] font-medium"
          onClick={handleManageEmode}
        >
          {t('page.lending.manageEmode.guide.buttonTitle')}
        </Button>
      </div>
    </Modal>
  );
};
