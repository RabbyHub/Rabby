import { Input } from 'antd';
import React from 'react';
import { ReactComponent as SearchSVG } from '@/ui/assets/search.svg';
import clsx from 'clsx';
import { useDebounce } from 'react-use';
import styled from 'styled-components';
import { useCommonPopupView } from '@/ui/utils';
import { useTranslation } from 'react-i18next';

export interface Props {
  onSearch?: (value: string) => void;
}

const InputStyled = styled(Input)`
  &.ant-input-affix-wrapper-focused {
    border-color: #8697ff !important;
  }
  &:hover {
    border-color: #8697ff !important;
  }
`;

export const TokenSearchInput = React.forwardRef<Input, Props>(
  ({ onSearch }, ref) => {
    const [input, setInput] = React.useState<string>('');
    const [isFocus, setIsFocus] = React.useState<boolean>(false);
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
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        className={clsx(
          'text-12 text-black py-0 px-[9px] h-[32px]',
          'border border-gray-divider rounded-[6px]',
          'transform-none w-[160px]',
          {
            'w-[248px]': isFocus || input,
          }
        )}
        prefix={<SearchSVG className="w-[14px] h-[14px]" />}
      />
    );
  }
);
