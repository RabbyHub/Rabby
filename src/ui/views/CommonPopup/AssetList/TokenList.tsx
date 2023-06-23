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
  onFocusInput: () => void;
}

export const TokenList: React.FC<Props> = ({ list, onFocusInput }) => {
  const totalValue = React.useMemo(() => {
    return list
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [list]);
  const { result: currentList } = useExpandList(list, totalValue);
  const lowValueList = React.useMemo(() => {
    return list?.filter((item) => currentList?.indexOf(item) === -1);
  }, [currentList]);

  return (
    <div>
      <div className="border-b-[0.5px] border-gray-divider">
        <TokenTable list={currentList} />
        <TokenLowValueItem list={lowValueList} className="h-[40px]" />
      </div>
      <div className="flex gap-12 mt-12">
        <CustomizedButton onClickLink={onFocusInput} />
        <BlockedButton onClickLink={onFocusInput} />
      </div>
    </div>
  );
};
