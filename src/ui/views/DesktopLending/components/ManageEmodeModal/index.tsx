import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';

const modalStyle = {
  width: 400,
  title: null as React.ReactNode,
  bodyStyle: { background: 'transparent', padding: 0, height: 212 } as const,
  maskClosable: true,
  footer: null as React.ReactNode,
  zIndex: 1000,
  className: 'modal-support-darkmode',
  closeIcon: ModalCloseIcon,
  centered: true,
  destroyOnClose: true,
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
      <div className="bg-r-neutral-bg-2 h-full px-[20px] py-[16px] flex flex-col items-center">
        <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1 text-center">
          {t('page.lending.manageEmode.guide.title')}
        </div>
        <div className="text-[13px] leading-[16px] text-r-neutral-foot mt-[8px]">
          {t('page.lending.manageEmode.guide.description')}
        </div>
        <Button
          type="primary"
          className="w-full mt-auto h-[44px] rounded-[8px] font-medium"
          onClick={handleManageEmode}
        >
          {t('page.lending.manageEmode.guide.buttonTitle')}
        </Button>
      </div>
    </Modal>
  );
};
