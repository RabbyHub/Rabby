import React from 'react';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';
import clsx from 'clsx';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';

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

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      centered
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closeIcon={ModalCloseIcon}
      destroyOnClose
      className="desktop-perps-leverage-modal modal-support-darkmode"
    >
      <div className="px-20">
        {/* Title */}
        <h3 className="text-[16px] font-medium text-rb-neutral-title-1 text-center mb-16">
          {coinSymbol} {t('page.perpsPro.leverage.title') || 'Leverage'}
        </h3>

        {/* Leverage Input Area */}
        <div className="bg-rb-neutral-bg-1 rounded-[8px] p-[16px]">
          {/* Max Leverage Display */}
          <div className="flex items-center mb-[12px]">
            <div className="flex items-end gap-[6px]">
              <div className="text-[13px] text-rb-neutral-foot">
                {t('page.perpsPro.leverage.upTo') || 'Up to'}
              </div>
              <div className="text-[20px] font-medium text-rb-neutral-title-1">
                {maxLeverage}x
              </div>
            </div>

            {/* Large Input */}
            <div className="flex-1 flex items-center justify-end">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={clsx(
                  'text-[32px] font-bold text-right bg-transparent border-none outline-none w-[120px]',
                  error ? 'text-r-red-default' : 'text-rb-neutral-title-1',
                  'placeholder-rb-neutral-foot'
                )}
                placeholder="0"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
              />
              <span
                className={clsx(
                  'text-[32px] font-bold ml-[4px]',
                  inputValue === ''
                    ? 'text-rb-neutral-foot'
                    : error
                    ? 'text-r-red-default'
                    : 'text-rb-neutral-title-1'
                )}
              >
                x
              </span>
            </div>
          </div>

          {/* Slider */}
          <DesktopPerpsSlider
            min={1}
            max={maxLeverage}
            value={leverage}
            onChange={handleSliderChange}
            step={1}
            tooltipVisible={false}
          />

          {/* Error Message */}
          {error && (
            <div className="mt-[12px] text-[12px] text-r-red-default">
              {error}
            </div>
          )}
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
          disabled={!!error || leverage < 1 || leverage > maxLeverage}
          size="large"
          type="primary"
          className={clsx(
            'w-full h-[44px] rounded-[8px] text-[14px] font-medium'
          )}
        >
          {t('page.perpsPro.leverage.confirm')}
        </Button>
      </div>
    </Modal>
  );
};
