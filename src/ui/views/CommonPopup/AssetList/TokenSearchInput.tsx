import { Input } from 'antd';
import React from 'react';
import { ReactComponent as SearchSVG } from '@/ui/assets/search.svg';
import clsx from 'clsx';
import { useDebounce } from 'react-use';

export interface Props {
  onSearch?: (value: string) => void;
}

export const TokenSearchInput: React.FC<Props> = ({ onSearch }) => {
  const [input, setInput] = React.useState<string>('');

  useDebounce(
    () => {
      onSearch?.(input);
    },
    200,
    [input]
  );

  return (
    <Input
      onChange={(e) => setInput(e.target.value)}
      placeholder="Tokens"
      className={clsx(
        'w-[160px] text-12 text-black py-0 px-[9px] h-[32px]',
        'border border-gray-divider rounded-[6px]'
      )}
      prefix={<SearchSVG className="w-[14px] h-[14px]" />}
    />
  );
};
