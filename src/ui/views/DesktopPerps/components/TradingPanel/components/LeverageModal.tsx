import React from 'react';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';
import clsx from 'clsx';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';

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
  const [leverage, setLeverage] = React.useState<number>(currentLeverage);
  const [inputValue, setInputValue] = React.useState<string>(
    currentLeverage.toString()
  );
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    if (visible) {
      setLeverage(currentLeverage);
      setInputValue(currentLeverage.toString());
      setError('');
    }
  }, [visible, currentLeverage]);

  const validateLeverage = (value: number): string => {
    if (value < 1) {
      return t('page.perpsPro.leverage.minError') || 'Minimum leverage is 1x';
    }
    if (value > maxLeverage) {
      return (
        t('page.perpsPro.leverage.maxError', { max: maxLeverage }) ||
        `Maximum leverage is ${maxLeverage}x`
      );
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty or numbers with optional decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setInputValue(value);

      if (value && !isNaN(Number(value))) {
        const numValue = Number(value);
        setLeverage(numValue);
        setError(validateLeverage(numValue));
      } else {
        setError('');
      }
    }
  };

  const handleSliderChange = (value: number) => {
    setLeverage(value);
    setInputValue(value.toString());
    setError(validateLeverage(value));
  };

  const handleConfirm = async () => {
    try {
      if (isConfirming) return;
      if (!error && leverage >= 1 && leverage <= maxLeverage) {
        setIsConfirming(true);
        await onConfirm(Math.round(leverage));
        setIsConfirming(false);
      }
    } catch (error) {
      console.error('Failed to change leverage:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handlePresetClick = (value: number) => {
    setLeverage(value);
    setInputValue(value.toString());
    setError(validateLeverage(value));
  };

  const handleInputBlur = () => {
    if (inputValue === '' || isNaN(Number(inputValue))) {
      setInputValue(currentLeverage.toString());
      setLeverage(currentLeverage);
      setError('');
    } else {
      const numValue = Number(inputValue);
      const clampedValue = Math.max(1, Math.min(maxLeverage, numValue));
      const roundedValue = Math.round(clampedValue);
      setLeverage(roundedValue);
      setInputValue(roundedValue.toString());
      setError(validateLeverage(roundedValue));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
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
            {t('page.perpsPro.leverage.title')}
          </h3>

          <div className="text-[13px] text-rb-neutral-body bg-rb-neutral-bg-1 rounded-[8px] gap-16 flex flex-col px-20 py-16">
            <div className="text-[13px] text-rb-neutral-body">
              {t('page.perpsPro.leverage.controlPositionLeverage', {
                coin: coinSymbol,
                max: maxLeverage,
              })}
            </div>
            <div className="text-[13px] text-rb-neutral-body">
              {t('page.perpsPro.leverage.maxPositionSize')}
            </div>

            <div className="flex items-center gap-[20px]">
              <div className="flex-1 space-y-[6px]">
                <DesktopPerpsSlider
                  min={1}
                  max={maxLeverage}
                  value={leverage}
                  onChange={handleSliderChange}
                  step={1}
                  tooltipVisible={false}
                />
                {/* Preset Points */}
                <div className="flex items-center justify-between">
                  {[0, 5, 10, 25].map((point) => (
                    <button
                      key={point}
                      onClick={() => handlePresetClick(point)}
                      className="text-[11px] text-r-neutral-foot transition-colors hover:text-r-blue-default"
                    >
                      {point}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-8 gap-[2px] h-[28px] w-[52px] shrink-0 border border-solid border-rb-neutral-line rounded-[8px] ">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  className="w-[24px] text-[12px] text-rb-neutral-title-1 font-medium text-left bg-transparent border-none outline-none focus:outline-none px-0"
                />
                <span className="text-[12px] text-rb-neutral-foot font-medium">
                  x
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 bg-rb-orange-light-1 rounded-[8px] px-12 py-10">
              <RcIconInfoCC className="text-rb-orange-default" />
              <div className=" text-[12px]  text-rb-orange-default font-medium">
                {t('page.perpsPro.leverage.higherLeverageRisk')}
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
