import { Popup } from '@/ui/component';
import { Button, DrawerProps } from 'antd';
import clsx from 'clsx';
import React, { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const SelectPopup = ({
  visible,
  onCancel,
  onConfirm,
  value,
  getContainer,
  options,
  title,
}: {
  value?: string;
  visible?: boolean;
  onCancel?: () => void;
  onConfirm?: (v: string) => void;
  getContainer?: DrawerProps['getContainer'];
  title?: ReactNode;
  options?: {
    label: string;
    value: string;
  }[];
}) => {
  const [inputValue, setInputValue] = useState(value || '');

  const { t } = useTranslation();

  useEffect(() => {
    if (visible) {
      setInputValue(value || '');
    }
  }, [visible, value]);

  return (
    <Popup
      visible={visible}
      onClose={onCancel}
      height={'fit-content'}
      // bodyStyle={{ height: '100%', padding: '14px 20px 0 20px' }}
      destroyOnClose
      isSupportDarkMode
      getContainer={getContainer}
    >
      <header className="mb-[32px]">
        <h1 className="text-center m-0 text-[20px] leading-[24px] text-r-neutral-title1 font-medium">
          {title}
        </h1>
      </header>
      <main className="flex items-center gap-[8px] mb-[32px]">
        {(options || []).map((item) => {
          const isActive = item.value === inputValue;
          return (
            <div
              key={item.value}
              className={clsx(
                'w-[25%] text-center py-[10px] px-[4px]',
                'border rounded-[6px]',
                'text-[14px] leading-[18px]',
                'hover:border-rabby-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default cursor-pointer',
                isActive
                  ? 'border-rabby-blue-default bg-r-blue-light1 text-r-blue-default'
                  : 'border-rabby-neutral-line text-r-neutral-title1'
              )}
              onClick={() => {
                setInputValue(item.value.toString());
              }}
            >
              {item.label}
            </div>
          );
        })}
      </main>
      <footer className="fixed-footer flex justify-between items-center gap-[16px]">
        <button
          type="button"
          className="flex-1 block  h-[60px] rounded-[8px] text-[18px] leading-[20px] bg-r-neutral-bg-4"
          onClick={onCancel}
        >
          {t('global.Cancel')}
        </button>
        <Button
          // disabled={disableSubmit}
          type="primary"
          block
          className="flex-1 h-[60px] rounded-[8px] text-[18px] leading-[20px]"
          onClick={() => onConfirm?.(inputValue)}
        >
          {t('global.Confirm')}
        </Button>
      </footer>
    </Popup>
  );
};
