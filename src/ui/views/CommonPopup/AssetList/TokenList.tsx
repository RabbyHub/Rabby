import React from 'react';
import { TBody, THeadCell, THeader, Table } from './components/Table';
import { TokenItem, Props as TokenItemProps } from './TokenItem';

export interface Props {
  list?: TokenItemProps['item'][];
}

export const TokenList: React.FC<Props> = ({ list }) => {
  const filteredList = React.useMemo(() => {
    return list?.filter((item) => {
      return item.is_core;
    });
  }, [list]);

  return (
    <div>
      <Table>
        <THeader>
          <THeadCell className="w-1/2">Asset / Amount</THeadCell>
          <THeadCell className="w-1/4">Price</THeadCell>
          <THeadCell className="w-1/4 text-right">USD Value</THeadCell>
        </THeader>
        <TBody>
          {filteredList?.map((item) => {
            return <TokenItem key={`${item.chain}-${item.id}`} item={item} />;
          })}
        </TBody>
      </Table>
    </div>
  );
};
