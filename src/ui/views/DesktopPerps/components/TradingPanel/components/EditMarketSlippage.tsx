import React from 'react';
import { Modal, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { DesktopPerpsInput } from '@/ui/views/DesktopPerps/components/DesktopPerpsInput';

export interface EditMarketSlippageProps {
  visible: boolean;
  onCancel: () => void;
}

export const EditMarketSlippage: React.FC<EditMarketSlippageProps> = ({
  visible,
  onCancel,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const currentSlippage = useRabbySelector(
    (state) => state.perps.marketSlippage
  );
  const [slippage, setSlippage] = React.useState<number>(currentSlippage * 100);
  const [inputValue, setInputValue] = React.useState<string>(
    (currentSlippage * 100).toFixed(2)
  );
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    if (visible) {
      const value = currentSlippage * 100;
      setSlippage(value);
      setInputValue(value.toFixed(2));
      setError('');
    }
  }, [visible, currentSlippage]);

  const validateSlippage = (value: number): string => {
    if (value < 0) {
      return t('page.perpsPro.tradingPanel.slippagePage.minError');
    }
    if (value > 100) {
      return t('page.perpsPro.tradingPanel.slippagePage.maxError');
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
        setSlippage(numValue);
        setError(validateSlippage(numValue));
      } else {
        setError('');
      }
    }
  };

  const handleConfirm = async () => {
    try {
      if (!error && slippage >= 0 && slippage <= 100) {
        await dispatch.perps.updateMarketSlippage(slippage / 100);
        onCancel();
      }
    } catch (err) {
      console.error('Failed to change slippage:', err);
    }
  };

  const handleInputBlur = () => {
    if (inputValue === '' || isNaN(Number(inputValue))) {
      const value = currentSlippage * 100;
      setInputValue(value.toFixed(2));
      setSlippage(value);
      setError('');
    } else {
      const numValue = Number(inputValue);
      const clampedValue = Math.max(0, Math.min(100, numValue));
      setSlippage(clampedValue);
      setInputValue(clampedValue.toFixed(2));
      setError(validateSlippage(clampedValue));
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
      }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closeIcon={ModalCloseIcon}
      destroyOnClose
      className="modal-support-darkmode desktop-perps-slippage-modal"
    >
      <div className="bg-rb-neutral-bg-2 flex flex-col h-full">
        <div className="pt-16 flex-1 pb-24">
          <h3 className="text-[20px] font-medium text-rb-neutral-title-1 text-center mb-16">
            {t('page.perpsPro.tradingPanel.slippagePage.title')}
          </h3>

          <div className="text-[13px] text-rb-neutral-foot rounded-[8px] gap-16 flex flex-col px-20">
            <div className="text-[13px] text-rb-neutral-foot">
              {t('page.perpsPro.tradingPanel.slippagePage.description')}
            </div>

            <DesktopPerpsInput
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              prefix={
                <span className="text-[13px] text-rb-neutral-foot">
                  {t('page.perpsPro.tradingPanel.slippagePage.maxSlippage')}
                </span>
              }
              className="text-right flex-1"
              suffix={
                <span className="text-[13px] text-rb-neutral-foot font-medium ml-2">
                  %
                </span>
              }
            />
            {error && (
              <div className="text-[12px] text-r-red-default text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={clsx(
          'border-t-[0.5px] bg-rb-neutral-bg-2 border-solid border-rabby-neutral-line px-20 py-16'
        )}
      >
        <div className="flex items-center gap-[16px]">
          <Button
            block
            size="large"
            type="ghost"
            onClick={onCancel}
            className={clsx(
              'h-[44px]',
              'text-blue-light',
              'border-blue-light',
              'before:content-none'
            )}
          >
            {t('global.Cancel')}
          </Button>
          <Button
            block
            size="large"
            type="primary"
            className="h-[44px] text-15 font-medium"
            disabled={!!error}
            onClick={handleConfirm}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditMarketSlippage;
