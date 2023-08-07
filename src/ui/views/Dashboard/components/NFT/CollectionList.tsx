import { UserCollection } from '@/background/service/openapi';
import { Empty } from '@/ui/component';
import { Skeleton } from 'antd';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VariableSizeList } from 'react-window';
import CollectionCard from './CollectionCard';

export interface NFTListProps {
  data: UserCollection[];
  isLoading: boolean;
  [key: string]: any;
}

const CollectionList = ({ isLoading, data }: NFTListProps) => {
  const { t } = useTranslation();
  const fixedList = useRef<VariableSizeList>();
  const [dict, setDict] = useState<Record<string, boolean>>({});
  const itemSize = (index: number) => {
    const { list } = data[index];
    const rows = Math.ceil(list.length / 5);
    if (list.length > 5) {
      return 64 * rows + 4 * (rows - 1) + 56;
    }
    return 120;
  };
  if (isLoading) {
    return (
      <div className="collection-list tokenList mt-0 bg-transparent shadow-none backdrop-filter-none">
        <div className="loadingContainer items-center">
          {Array(4)
            .fill(1)
            .map((_, i) => (
              <div className="nftLoadingContainer mb-[8px]" key={i}>
                <Skeleton.Input
                  active
                  style={{
                    width: 139,
                    height: 15,
                  }}
                />
                <div className="flex justify-between mt-[8px]">
                  {Array(5)
                    .fill(1)
                    .map((_, i) => (
                      <Skeleton.Input
                        active
                        key={i}
                        style={{
                          width: 64,
                          height: 64,
                        }}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }
  if (data.length > 0) {
    return (
      <div className="collection-list">
        <VariableSizeList
          height={468}
          width="100%"
          itemData={data}
          itemCount={data?.length}
          estimatedItemSize={120}
          itemSize={itemSize}
          ref={fixedList as React.MutableRefObject<VariableSizeList<any>>}
          style={{ zIndex: 10, overflowX: 'hidden', paddingBottom: 50 }}
        >
          {(props) => {
            const expanded = dict[data[props.index]?.collection?.id];
            return (
              <div style={props.style} className="overflow-hidden">
                <CollectionCard
                  {...props}
                  expaned={expanded}
                  onChange={(id, v) => {
                    setDict((pre) => {
                      return {
                        ...pre,
                        [id]: v,
                      };
                    });
                    fixedList.current?.resetAfterIndex(props.index);
                  }}
                />
              </div>
            );
          }}
        </VariableSizeList>
      </div>
    );
  }
  return (
    <div className="collection-list tokenList mt-0">
      <Empty
        desc={
          <span className="text-white opacity-80">
            {t('page.dashboard.nft.empty')}
          </span>
        }
        className="pt-[120px] w-full"
      ></Empty>
    </div>
  );
};

export default CollectionList;
