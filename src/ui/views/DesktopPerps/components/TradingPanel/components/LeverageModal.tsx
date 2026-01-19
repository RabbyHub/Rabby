import React from 'react';
import { Button, message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';
import clsx from 'clsx';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { LeverageInput } from './LeverageInput';

interface LeverageModalProps {
  visible: boolean;
  currentLeverage: number;
  maxLeverage: number;
  coinSymbol?: string;
  onConfirm: (leverage: number) => Promise<void>;
  onCancel: () => void;
}

export const LeverageModal: React.FC<LeverageModalProps> = ({
  visible,
  currentLeverage,
  maxLeverage,
  coinSymbol = 'ETH',
  onConfirm,
  onCancel,
}) => {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const { t } = useTranslation();
  const [selectedLeverage, setLeverage] = React.useState<number | undefined>(
    currentLeverage
  );
  const leverage = selectedLeverage || 1;
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    if (visible) {
      setLeverage(currentLeverage);
      setError('');
    }
  }, [visible, currentLeverage]);

  const handleConfirm = async () => {
    try {
      if (isConfirming) return;
      if (leverage >= 1 && leverage <= maxLeverage) {
        setIsConfirming(true);
        await onConfirm(Math.round(leverage));
        setIsConfirming(false);
      }
    } catch (e) {
      console.error('Failed to change leverage:', e);
    } finally {
      setIsConfirming(false);
    }
  };

  const leverageRangeValidation = React.useMemo(() => {
    if (selectedLeverage == null || Number.isNaN(+selectedLeverage)) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMinError', {
          min: 1,
        }),
      };
    }
    if (selectedLeverage > maxLeverage) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMaxError', {
          max: maxLeverage,
        }),
      };
    }

    if (selectedLeverage < 1) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMinError', {
          min: 1,
        }),
      };
    }
    return { error: false, errorMessage: '' };
  }, [selectedLeverage, maxLeverage, t]);

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      centered
      bodyStyle={{
        padding: 0,
      }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closeIcon={ModalCloseIcon}
      destroyOnClose
      className="modal-support-darkmode desktop-perps-margin-mode-modal"
    >
      <div className="bg-r-neutral-bg-2 flex flex-col h-full">
        <div className="px-20 pt-16 flex-1 pb-24">
          {/* Title */}
          <h3 className="text-[16px] font-medium text-rb-neutral-title-1 text-center mb-16">
            {t('page.perpsPro.leverage.title')}
          </h3>

          <LeverageInput
            title={t('page.perps.leverage')}
            value={selectedLeverage}
            onChange={setLeverage}
            min={1}
            max={maxLeverage}
            step={1}
            errorMessage={
              leverageRangeValidation.error &&
              leverageRangeValidation.errorMessage
                ? leverageRangeValidation.errorMessage
                : undefined
            }
          />
        </div>
        <div
          className={clsx(
            'border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16'
          )}
        >
          <Button
            loading={isConfirming}
            onClick={handleConfirm}
            disabled={leverageRangeValidation.error || isConfirming}
            size="large"
            type="primary"
            className={clsx(
              'w-full h-[44px] rounded-[8px] text-[14px] font-medium'
            )}
          >
            {t('page.perpsPro.marginMode.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
