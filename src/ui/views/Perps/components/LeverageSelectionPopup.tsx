import React from 'react';
import { Button } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';

interface LeverageSelectionPopupProps {
  visible: boolean;
  currentLeverage: number;
  leverageRange: [number, number];
  onCancel: () => void;
  onConfirm: (leverage: number) => void;
}

export const LeverageSelectionPopup: React.FC<LeverageSelectionPopupProps> = ({
  visible,
  currentLeverage,
  leverageRange,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [selectedLeverage, setSelectedLeverage] = React.useState(
    currentLeverage
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (visible && inputRef.current) {
      // 使用 setTimeout 确保弹窗完全渲染后再聚焦
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  React.useEffect(() => {
    if (visible) {
      setSelectedLeverage(currentLeverage);
    }
  }, [visible, currentLeverage]);

  const handleConfirm = () => {
    onConfirm(selectedLeverage);
  };

  const handleLeverageChange = (value: number) => {
    setSelectedLeverage(value);
  };

  const leverageRangeValidation = React.useMemo(() => {
    if (selectedLeverage > leverageRange[1]) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMaxError', {
          max: leverageRange[1],
        }),
      };
    }

    if (selectedLeverage < leverageRange[0]) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMinError', {
          min: leverageRange[0],
        }),
      };
    }
    return { error: false, errorMessage: '' };
  }, [selectedLeverage, leverageRange]);

  const getLeverageTextColor = () => {
    if (leverageRangeValidation.error) {
      return 'text-r-red-default';
    }
    return 'text-r-neutral-title-1';
  };

  return (
    <Popup
      placement="bottom"
      height={320}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onCancel}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-18 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
          {t('page.perps.leverage')}
        </div>

        <div className="w-full px-16">
          <div
            className="p-16 bg-r-neutral-bg1 relative rounded-[8px]"
            style={{ height: 148 }}
          >
            <div className="text-15 text-r-neutral-foot mb-24 text-center">
              {leverageRange[0]}-{leverageRange[1]}x
            </div>

            <div
              className="
                text-13 text-r-neutral-body py-8 px-16 bg-r-neutral-card-2 rounded-[8px] cursor-pointer hover:bg-r-blue-light-1 hover:text-r-blue-default absolute top-[64px] left-[16px]"
              onClick={() => {
                setSelectedLeverage(leverageRange[0]);
              }}
            >
              Min
            </div>
            <div
              className="
              text-13 text-r-neutral-body py-8 px-16 bg-r-neutral-card-2 rounded-[8px] cursor-pointer hover:bg-r-blue-light-1 hover:text-r-blue-default absolute top-[64px] right-[16px]"
              onClick={() => {
                setSelectedLeverage(leverageRange[1]);
              }}
            >
              Max
            </div>
            <input
              className={`text-[32px] bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none h-[50px] ${getLeverageTextColor()}`}
              ref={inputRef}
              autoFocus
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
              value={selectedLeverage}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  const num = value === '' ? 0 : parseInt(value);
                  handleLeverageChange(num);
                }
              }}
            />
            {leverageRangeValidation.error && (
              <div className="text-13 text-r-red-default text-center mt-8">
                {leverageRangeValidation.errorMessage}
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
          <Button
            disabled={leverageRangeValidation.error}
            block
            size="large"
            type="primary"
            className="h-[48px] text-15 font-medium"
            onClick={handleConfirm}
          >
            {t('page.perps.confirm')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default LeverageSelectionPopup;
