import React from 'react';
import {
  TBody,
  THeadCell,
  THeader,
  Table,
} from '@/ui/views/CommonPopup/AssetList/components/Table';
import { Props as TokenItemProps } from '@/ui/views/CommonPopup/AssetList/TokenItem';
import { FixedSizeList } from 'react-window';
import { TokenItem } from './TokenItem';

export interface Props {
  list?: TokenItemProps['item'][];
  virtual?: {
    height: number;
    itemSize: number;
  };
  EmptyComponent?: React.ReactNode;
}

export const TokenTable: React.FC<Props> = ({
  list,
  virtual,
  EmptyComponent,
}) => {
  return (
    <>
      {EmptyComponent && !list?.length ? (
        EmptyComponent
      ) : (
        <Table className="!w-full ml-0 mr-0">
          <THeader
            className="w-full justify-between bg-r-neutral-bg-1 rounded-[6px] py-8"
            rowClassName="px-8"
          >
            <THeadCell className="flex-1">Token</THeadCell>
            <THeadCell className="flex-1">Price</THeadCell>
            <THeadCell className="flex-1">Amount</THeadCell>
            <THeadCell className="flex-1 text-right">USD Value</THeadCell>
          </THeader>
          <TBody className="mt-0">
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
                  const last = index === (list?.length || 0) - 1;
                  return (
                    <TokenItem
                      style={style}
                      key={`${item.chain}-${item.id}`}
                      item={item}
                      isLast={last}
                    />
                  );
                }}
              </FixedSizeList>
            ) : (
              list?.map((item, index) => {
                const last = index === (list?.length || 0) - 1;
                return (
                  <TokenItem
                    key={`${item.chain}-${item.id}`}
                    item={item}
                    isLast={last}
                  />
                );
              })
            )}
          </TBody>
        </Table>
      )}
    </>
  );
};
