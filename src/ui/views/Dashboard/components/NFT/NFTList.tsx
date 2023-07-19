import { NFTItem } from '@/background/service/openapi';
import { Empty } from '@/ui/component';
import { Skeleton } from 'antd';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList } from 'react-window';
import NFTListRow from './NFTListRow';

export interface NFTListProps {
  isLoading: boolean;
  data: NFTItem[];
}
const NFTList = ({ isLoading, data }: NFTListProps) => {
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();
  if (isLoading) {
    return (
      <div className="nft-list loadingContainer justify-start">
        {Array(8)
          .fill(1)
          .map((_, i) => (
            <div key={i} className="flex items-center mt-[20px] ml-[20px]">
              <Skeleton.Input
                active
                style={{
                  width: 32,
                  height: 32,
                  marginRight: 8,
                }}
              />
              <div className="flex flex-col">
                <Skeleton.Input
                  active
                  style={{
                    width: 139,
                    height: 15,
                    marginBottom: 2,
                  }}
                />
                <Skeleton.Input
                  active
                  style={{
                    width: 59,
                    height: 14,
                  }}
                />
              </div>
            </div>
          ))}
      </div>
    );
  }
  return (
    <div className="nft-list">
      {data.length > 0 ? (
        <FixedSizeList
          height={468}
          width="100%"
          itemData={data}
          itemCount={data?.length}
          itemSize={52}
          ref={fixedList as React.MutableRefObject<FixedSizeList<any>>}
          style={{ zIndex: 10, overflowX: 'hidden', paddingBottom: 50 }}
        >
          {NFTListRow}
        </FixedSizeList>
      ) : (
        <Empty
          desc={
            <span className="text-white opacity-80">
              {t("You haven't gotten any NFT yet")}
            </span>
          }
          className="pt-[120px] w-full"
        ></Empty>
      )}
    </div>
  );
};

export default NFTList;
