import { UserCollection } from '@/background/service/openapi';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VariableSizeList } from 'react-window';
import { SvgIconLoading } from 'ui/assets';
import CollectionCard from './CollectionCard';

export interface NFTListProps {
  data: UserCollection[];
  isLoading: boolean;
  [key: string]: any;
}

const CollectionList = ({ isLoading, data }: NFTListProps) => {
  console.log('colect', data);
  const { t } = useTranslation();
  const fixedList = useRef<VariableSizeList>();
  const [dict, setDict] = useState<Record<string, boolean>>({});
  const itemSize = (index: number) => {
    const { collection, list } = data[index];
    const expanded = !!dict[collection.id];
    console.log(dict);
    const rows = Math.ceil(list.length / 5);
    if (expanded && list.length > 5) {
      return 64 * rows + (4 * rows - 1) + 56;
    }
    return 120;
  };
  if (isLoading) {
    return (
      <div className="collection-list">
        <div className="loadingContainer items-center">
          <SvgIconLoading className="icon icon-loading ml-0" fill="#FFFFFF" />
          <div className="loading-text">{t('Loading Collections')}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="collection-list">
      {data.length > 0 ? (
        <VariableSizeList
          height={468}
          width="100%"
          itemData={data}
          itemCount={data?.length}
          estimatedItemSize={120}
          itemSize={itemSize}
          ref={fixedList}
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
                    fixedList.current.resetAfterIndex(props.index);
                  }}
                />
              </div>
            );
          }}
        </VariableSizeList>
      ) : (
        <div className="no-data">
          <img className="w-[100px] h-[100px]" src="./images/nodata-tx.png" />
          <div className="loading-text">{t('No Collections')}</div>
        </div>
      )}
    </div>
  );
};

export default CollectionList;
