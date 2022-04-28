import { NFTItem } from '@/background/service/openapi';
import { Empty } from '@/ui/component';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList } from 'react-window';
import { SvgIconLoading } from 'ui/assets';
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
      <div className="nft-list">
        {
          <div className="loadingContainer items-center">
            <SvgIconLoading className="icon icon-loading ml-0" fill="#FFFFFF" />
            <div className="loading-text">{t('Loading NFTs')}</div>
          </div>
        }
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
          ref={fixedList}
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
