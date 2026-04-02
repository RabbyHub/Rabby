import { Popup } from '@/ui/component';
import { Button, DrawerProps } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const SlippagePopup = ({
  slippage,
  onChange,
  getContainer,
}: {
  slippage: number;
  onChange(slippage: number): void;
  getContainer?: DrawerProps['getContainer'];
}) => {
  const [inputValue, setInputValue] = useState(slippage.toString());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleBlur = () => {
    let value = parseFloat(inputValue);
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 100) {
      value = 100;
    }
    setInputValue(value.toString());
    onChange(value);
  };

  const { t } = useTranslation();

  return (
    <Popup
      visible={true}
      // onClose={handleCancel}
      height={'fit-content'}
      // bodyStyle={{ height: '100%', padding: '14px 20px 0 20px' }}
      destroyOnClose
      isSupportDarkMode
      getContainer={getContainer}
    >
      <header className="mb-[32px]">
        <h1 className="text-center m-0 text-[20px] leading-[24px] text-r-neutral-title1 font-medium">
          Slippage tolerance
        </h1>
      </header>
      <main className="flex items-center gap-[8px] mb-[32px]">
        {[1, 3, 10, 20].map((item) => {
          const isActive = item === 1;
          return (
            <div
              key={item}
              className={clsx(
                'w-[25%] text-center py-[10px] px-[4px]',
                'border rounded-[6px]',
                'text-[14px] leading-[18px]',
                'hover:border-rabby-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default cursor-pointer',
                isActive
                  ? 'border-rabby-blue-default bg-r-blue-light1 text-r-blue-default'
                  : 'border-rabby-neutral-line text-r-neutral-title1'
              )}
            >
              {item}%
            </div>
          );
        })}
      </main>
      <footer className="fixed-footer flex justify-between items-center gap-[16px]">
        <button
          type="button"
          className="flex-1 block  h-[60px] rounded-[8px] text-[18px] leading-[20px] bg-r-neutral-bg-4"
          // onClick={handleCancel}
        >
          {t('global.Cancel')}
        </button>
        <Button
          // disabled={disableSubmit}
          type="primary"
          block
          className="flex-1 h-[60px] rounded-[8px] text-[18px] leading-[20px]"
          // onClick={handleSubmit}
        >
          {t('global.Confirm')}
        </Button>
      </footer>
    </Popup>
  );
};
