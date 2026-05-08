import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { PerpsBlueBorderedButton } from '@/ui/views/Perps/components/BlueBorderedButton';

interface EnableUnifiedAccountModalProps {
  visible: boolean;
  /** Stack-aware z-index from usePerpsPopupNav. */
  zIndex?: number;
  onCancel: () => void;
  onConfirm: () => Promise<boolean | void>;
}

export const EnableUnifiedAccountModal: React.FC<EnableUnifiedAccountModalProps> = ({
  visible,
  zIndex,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ok = await onConfirm();
      if (ok !== false) {
        onCancel();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={loading ? undefined : onCancel}
      footer={null}
      width={400}
      centered
      zIndex={zIndex}
      closable={false}
      maskClosable={!loading}
      keyboard={!loading}
      className={clsx(
        'modal-support-darkmode perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      )}
    >
      <div className="flex flex-col gap-12">
        <div className="text-[20px] font-medium text-r-neutral-title-1 text-center">
          {t('page.perps.EnableUnifiedAccount.title')}
        </div>

        <div className="text-[14px] leading-[20px] text-r-neutral-body">
          {t('page.perps.EnableUnifiedAccount.desc')}
        </div>

        <div className="text-[14px] leading-[20px] font-medium text-r-neutral-title-1 mt-[20px] mb-[40px]">
          {'💡'}
          {t('page.perps.EnableUnifiedAccount.importantTips')}
        </div>

        <div className="flex items-center justify-center w-full gap-12">
          <PerpsBlueBorderedButton block onClick={onCancel} disabled={loading}>
            {t('page.perps.EnableUnifiedAccount.cancel')}
          </PerpsBlueBorderedButton>
          <Button
            size="large"
            block
            type="primary"
            loading={loading}
            onClick={handleConfirm}
          >
            {t('page.perps.EnableUnifiedAccount.enable')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EnableUnifiedAccountModal;
