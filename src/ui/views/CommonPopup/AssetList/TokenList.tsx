import React from 'react';
import { Props as TokenItemProps } from './TokenItem';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import BigNumber from 'bignumber.js';
import { TokenLowValueItem } from './TokenLowValueItem';
import { TokenTable } from './components/TokenTable';
import { BlockedButton } from './BlockedButton';
import { CustomizedButton } from './CustomizedButton';

export interface Props {
  list?: TokenItemProps['item'][];
  isSearch: boolean;
  onFocusInput: () => void;
}

export const TokenList: React.FC<Props> = ({
  list,
  onFocusInput,
  isSearch,
}) => {
  const totalValue = React.useMemo(() => {
    return list
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [list]);
  const { result: currentList } = useExpandList(list, totalValue);
  const lowValueList = React.useMemo(() => {
    return list?.filter((item) => currentList?.indexOf(item) === -1);
  }, [currentList, list, isSearch]);

  return (
    <div>
      <div>
        <TokenTable list={isSearch ? list : currentList} />
        {!isSearch && (
          <TokenLowValueItem list={lowValueList} className="h-[40px]" />
        )}
      </div>
      {!isSearch && (
        <div className="flex gap-12 pt-12 border-t-[0.5px] border-gray-divider">
          <CustomizedButton onClickLink={onFocusInput} />
          <BlockedButton onClickLink={onFocusInput} />
        </div>
      )}
    </div>
  );
};
