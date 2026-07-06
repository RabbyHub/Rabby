import React from 'react';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { MarginMode } from '../../../types';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { Checkbox } from '@/ui/component';
import clsx from 'clsx';
import { SvgIconCross } from 'ui/assets';
import { PerpsCheckbox } from './PerpsCheckbox';
import { formatPerpsCoin } from '../../../utils';

interface MarginModeModalProps {
  visible: boolean;
  currentMode: MarginMode;
  coinSymbol?: string;
  onConfirm: (mode: MarginMode) => Promise<void>;
  onCancel: () => void;
  // When provided, the modal is absolutely positioned (anchored below a
  // trigger) instead of screen-centred. The mask stays unchanged.
  positionStyle?: React.CSSProperties;
}

export const MarginModeModal: React.FC<MarginModeModalProps> = ({
  visible,
  currentMode,
  coinSymbol = 'ETH',
  onConfirm,
  onCancel,
  positionStyle,
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
      centered={!positionStyle}
      style={positionStyle}
      bodyStyle={{
        padding: 0,
      }}
      maskStyle={{
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-rb-neutral-body" />
      }
      destroyOnClose
      className="modal-support-darkmode desktop-perps-modal-surface  desktop-perps-margin-mode-modal"
    >
      <div className="bg-rb-neutral-bg-0 flex flex-col h-full">
        <div className="px-20 pt-16 flex-1 pb-24">
          {/* Title */}
          <h3 className="text-[16px] font-medium text-rb-neutral-title-1 text-start mb-16">
            {formatPerpsCoin(coinSymbol)}{' '}
            {t('page.perpsPro.marginMode.title') || 'Margin Mode'}
          </h3>

          {/* Options */}
          <div className="space-y-[12px]">
            {/* Cross Mode */}
            <div
              onClick={() => handleModeSelect(MarginMode.CROSS)}
              className={clsx(
                'p-[12px] rounded-[8px] border cursor-pointer bg-r-neutral-card1',
                selectedMode === MarginMode.CROSS
                  ? 'border-rb-brand-default'
                  : 'border-rb-neutral-line'
              )}
            >
              <div className="flex items-start gap-[8px]">
                <PerpsCheckbox
                  variant="radio-check"
                  size={16}
                  checked={selectedMode === MarginMode.CROSS}
                  onChange={() => handleModeSelect(MarginMode.CROSS)}
                />

                <div className="flex-1 mt-[-2px]">
                  <div className="text-[14px] font-medium text-rb-neutral-title-1 mb-[4px]">
                    {t('page.perpsPro.marginMode.cross') || 'Cross'}
                  </div>
                  <p className="text-[12px] text-rb-neutral-body leading-[18px]">
                    {t('page.perpsPro.marginMode.crossDescription')}
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => handleModeSelect(MarginMode.ISOLATED)}
              className={clsx(
                'p-[12px] rounded-[8px] border cursor-pointer bg-r-neutral-card1',
                selectedMode === MarginMode.ISOLATED
                  ? 'border-rb-brand-default'
                  : 'border-rb-neutral-line'
              )}
            >
              <div className="flex items-start gap-[8px]">
                <PerpsCheckbox
                  variant="radio-check"
                  size={16}
                  checked={selectedMode === MarginMode.ISOLATED}
                  onChange={() => handleModeSelect(MarginMode.ISOLATED)}
                />

                <div className="flex-1 mt-[-2px]">
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
        <div className={clsx('px-20 pb-16')}>
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
