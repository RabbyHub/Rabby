import { ReactComponent as SearchSVG } from '@/ui/assets/search.svg';
import { useCommonPopupView } from '@/ui/utils';
import { Input, InputRef } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounceEffect } from 'ahooks';
import styles from './TokenSearchInput.module.css';

export interface Props {
  onSearch?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
}

export const TokenSearchInput = React.forwardRef<InputRef, Props>(
  ({ onSearch, onBlur, onFocus, className, placeholder }, ref) => {
    const [input, setInput] = React.useState<string>('');
    const { visible } = useCommonPopupView();
    const { t } = useTranslation();

    React.useEffect(() => {
      if (!visible) {
        setInput('');
      }
    }, [visible]);

    useDebounceEffect(
      () => {
        onSearch?.(input);
      },
      [input],
      { wait: 300 }
    );

    return (
      <Input
        ref={ref}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          placeholder || t('page.dashboard.assets.searchPlaceholder')
        }
        onFocus={onFocus}
        onBlur={onBlur}
        allowClear
        className={clsx(
          styles.input,
          'text-12 text-r-neutral-foot py-0 px-[9px] h-[32px]',
          'rounded-[6px]',
          'transform-none',
          className
        )}
        prefix={<SearchSVG className="w-[14px] h-[14px]" />}
      />
    );
  }
);
