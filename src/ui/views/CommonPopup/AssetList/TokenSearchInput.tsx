import { ReactComponent as SearchSVG } from '@/ui/assets/search.svg';
import { useCommonPopupView } from '@/ui/utils';
import { Input } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import styled from 'styled-components';

export interface Props {
  onSearch?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

const InputStyled = styled(Input)`
  background-color: var(--r-neutral-card1, #fff) !important;
  &.ant-input-affix-wrapper-focused {
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  &:hover {
    border-color: var(--r-blue-default, #7084ff) !important;
  }
`;

export const TokenSearchInput = React.forwardRef<Input, Props>(
  ({ onSearch, onBlur, onFocus, className }, ref) => {
    const [input, setInput] = React.useState<string>('');
    const { visible } = useCommonPopupView();
    const { t } = useTranslation();

    React.useEffect(() => {
      if (!visible) {
        setInput('');
      }
    }, [visible]);

    useDebounce(
      () => {
        onSearch?.(input);
      },
      300,
      [input]
    );

    return (
      <InputStyled
        ref={ref}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t('page.dashboard.assets.searchPlaceholder')}
        onFocus={onFocus}
        onBlur={onBlur}
        allowClear
        className={clsx(
          'text-12 text-black py-0 px-[9px] h-[32px]',
          'rounded-[6px]',
          'transform-none',
          className
        )}
        prefix={<SearchSVG className="w-[14px] h-[14px]" />}
      />
    );
  }
);
