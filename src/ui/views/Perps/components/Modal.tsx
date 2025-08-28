import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ImgDeleteWarning } from 'ui/assets/perps/ImgDeleteWarning.svg';
import { Button, message, Modal } from 'antd';
import clsx from 'clsx';
import { PerpsBlueBorderedButton } from './BlueBorderedButton';

interface PerpsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const PerpsModal = ({
  visible,
  onClose,
  onConfirm,
}: PerpsModalProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Modal
      destroyOnClose
      className="perp-delete-agent-modal"
      visible={visible}
      centered
      closable={false}
      footer={null}
      onCancel={onClose}
    >
      <div className="flex items-center justify-center flex-col gap-12 px-20">
        <ImgDeleteWarning />
        <div className="text-15 font-medium text-r-neutral-title-1 text-center">
          {t('page.perps.deleteAgentModal')}
        </div>
        <div className="flex items-center justify-center w-full gap-12 mt-20">
          <div className="flex-1">
            <PerpsBlueBorderedButton block onClick={onClose}>
              {t('page.manageAddress.cancel')}
            </PerpsBlueBorderedButton>
          </div>
          <div className="flex-1">
            <Button
              size="large"
              block
              type="primary"
              onClick={async () => {
                setIsLoading(true);
                await onConfirm();
                message.success(t('page.perps.deleteAgentSuccess'));
                onClose();
                setIsLoading(false);
              }}
              loading={isLoading}
            >
              {t('page.manageAddress.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
