import React from 'react';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { MarginMode } from '../../../types';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { Checkbox } from '@/ui/component';
import clsx from 'clsx';

interface MarginModeModalProps {
  visible: boolean;
  currentMode: MarginMode;
  coinSymbol?: string;
  onConfirm: (mode: MarginMode) => Promise<void>;
  onCancel: () => void;
}

export const MarginModeModal: React.FC<MarginModeModalProps> = ({
  visible,
  currentMode,
  coinSymbol = 'ETH',
  onConfirm,
  onCancel,
}) => {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = React.useState<MarginMode>(
    currentMode
  );

  React.useEffect(() => {
    if (visible) {
      setSelectedMode(currentMode);
    }
  }, [visible, currentMode]);

  const handleConfirm = async () => {
    try {
      if (isConfirming) return;
      setIsConfirming(true);
      await onConfirm(selectedMode);
      setIsConfirming(false);
    } catch (error) {
      console.error('Failed to change margin mode:', error);
    }
  };

  const handleModeSelect = (mode: MarginMode) => {
    setSelectedMode(mode);
  };

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      centered
      bodyStyle={{
        padding: 0,
        height: '520px',
      }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closeIcon={ModalCloseIcon}
      destroyOnClose
      className="desktop-perps-margin-mode-modal"
    >
      <div className="flex flex-col h-full">
        <div className="px-20 pt-16 flex-1">
          {/* Title */}
          <h3 className="text-[16px] font-medium text-rb-neutral-title-1 text-center mb-16">
            {coinSymbol} {t('page.perpsPro.marginMode.title') || 'Margin Mode'}
          </h3>

          {/* Options */}
          <div className="space-y-[12px]">
            {/* Cross Mode */}
            <div
              onClick={() => handleModeSelect(MarginMode.CROSS)}
              className={clsx(
                'p-[12px] rounded-[8px] border cursor-pointer transition-all',
                selectedMode === MarginMode.CROSS
                  ? 'border-rb-brand-default bg-rb-brand-light-1'
                  : 'border-rb-neutral-line bg-transparent hover:bg-rb-neutral-bg-1'
              )}
            >
              <div className="flex items-start gap-[8px]">
                {/* Checkbox */}
                <Checkbox
                  type="square"
                  width="16px"
                  height="16px"
                  checked={selectedMode === MarginMode.CROSS}
                  className="mt-[2px] rounded-[4px]"
                  onChange={() => handleModeSelect(MarginMode.CROSS)}
                />

                {/* Content */}
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-rb-neutral-title-1 mb-[4px]">
                    {t('page.perpsPro.marginMode.cross') || 'Cross'}
                  </div>
                  <p className="text-[12px] text-rb-neutral-body leading-[18px]">
                    {t('page.perpsPro.marginMode.crossDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Isolated Mode */}
            <div
              onClick={() => handleModeSelect(MarginMode.ISOLATED)}
              className={clsx(
                'p-[12px] rounded-[8px] border cursor-pointer transition-all',
                selectedMode === MarginMode.ISOLATED
                  ? 'border-rb-brand-default bg-rb-brand-light-1'
                  : 'border-rb-neutral-line bg-transparent hover:bg-rb-neutral-bg-1'
              )}
            >
              <div className="flex items-start gap-[8px]">
                {/* Checkbox */}
                <Checkbox
                  type="square"
                  width="16px"
                  height="16px"
                  checked={selectedMode === MarginMode.ISOLATED}
                  className="mt-[2px] rounded-[4px]"
                  onChange={() => handleModeSelect(MarginMode.ISOLATED)}
                />

                {/* Content */}
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-rb-neutral-title-1 mb-[4px]">
                    {t('page.perpsPro.marginMode.isolated') || 'Isolated'}
                  </div>
                  <p className="text-[12px] text-rb-neutral-body leading-[18px]">
                    {t('page.perpsPro.marginMode.isolatedDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className={clsx(
            'border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16'
          )}
        >
          <Button
            loading={isConfirming}
            onClick={handleConfirm}
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
