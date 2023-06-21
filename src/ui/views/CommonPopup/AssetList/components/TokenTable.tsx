import React from 'react';
import { TBody, THeadCell, THeader, Table } from './Table';
import { TokenItem, Props as TokenItemProps } from '../TokenItem';
import { FixedSizeList } from 'react-window';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';

export interface Props {
  list?: TokenItemProps['item'][];
  virtual?: {
    height: number;
    itemSize: number;
  };
}

export const TokenTable: React.FC<Props> = ({ list, virtual }) => {
  const [selected, setSelected] = React.useState<TokenItemProps['item']>();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(!!selected);
  }, [selected]);

  console.log(selected);
  return (
    <Table>
      <THeader>
        <THeadCell className="w-1/2">Asset / Amount</THeadCell>
        <THeadCell className="w-1/4">Price</THeadCell>
        <THeadCell className="w-1/4 text-right">USD Value</THeadCell>
      </THeader>
      <TBody className="mt-8">
        {virtual ? (
          <FixedSizeList
            height={virtual.height}
            width="100%"
            itemData={list}
            itemCount={list?.length || 0}
            itemSize={virtual.itemSize}
          >
            {({ data, index, style }) => {
              const item = data[index];
              return (
                <TokenItem
                  onClick={() => setSelected(item)}
                  style={style}
                  key={`${item.chain}-${item.id}`}
                  item={item}
                />
              );
            }}
          </FixedSizeList>
        ) : (
          list?.map((item) => {
            return (
              <TokenItem
                onClick={() => setSelected(item)}
                key={`${item.chain}-${item.id}`}
                item={item}
              />
            );
          })
        )}
      </TBody>
      <TokenDetailPopup
        token={selected}
        visible={visible}
        onClose={() => setSelected(undefined)}
        addToken={function (): void {
          throw new Error('Function not implemented.');
        }}
        removeToken={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    </Table>
  );
};
