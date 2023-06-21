import React from 'react';
import { Props as TokenItemProps } from './TokenItem';
import { findChainByEnum } from '@/utils/chain';
import { CHAINS } from '@debank/common';
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

const ChainValues = Object.values(CHAINS);
export const TokenList: React.FC<Props> = ({ list, onFocusInput }) => {
  // is_core is true
  // is in chain list
  // with customized list
  // not in blocked list
  // not zero balance
  const filteredList = React.useMemo(() => {
    return list?.filter((item) => {
      const chain = ChainValues.find((chain) => chain.serverId === item.chain);
      return findChainByEnum(chain?.enum);
    });
  }, [list]);
  const totalValue = React.useMemo(() => {
    return filteredList
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [filteredList]);
  const { result: currentList } = useExpandList(filteredList, totalValue);
  const lowValueList = React.useMemo(() => {
    return filteredList?.filter((item) => currentList?.indexOf(item) === -1);
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
