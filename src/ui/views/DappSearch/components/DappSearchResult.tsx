import React from 'react';
import { DappCard } from './DappCard';
import { range } from 'lodash';
import { BasicDappInfo } from '@rabby-wallet/rabby-api/dist/types';
import { DappCardSkeleton } from './DappCardSkeleton';
import { DappSearchEmpty } from './DappSearchEmpty';
import { ConnectedSite } from '@/background/service/permission';

export const DappSearchResult = ({
  leftSlot,
  rightSlot,
  data,
  loading,
  loadingMore,
  siteDict,
  onFavoriteChange,
}: {
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  data: BasicDappInfo[];
  loading?: boolean;
  loadingMore?: boolean;
  siteDict?: Record<string, ConnectedSite>;
  onFavoriteChange?: (v: boolean, item: BasicDappInfo) => void;
}) => {
  return (
    <div>
      <div className="flex items-center h-[32px] mb-[8px]">
        {leftSlot}
        <div className="ml-auto">{rightSlot}</div>
      </div>
      {loading ? (
        <div className="flex flex-col gap-[16px]">
          {range(0, 7).map((i) => {
            return <DappCardSkeleton key={i} />;
          })}
        </div>
      ) : data?.length ? (
        <div className="flex flex-col gap-[16px]">
          {data.map((dapp) => {
            return (
              <DappCard
                key={dapp.id}
                data={dapp}
                isFavorite={siteDict?.[`https://${dapp.id}`]?.isFavorite}
                onFavoriteChange={onFavoriteChange}
              />
            );
          })}
          {loadingMore ? <DappCardSkeleton /> : null}
        </div>
      ) : (
        <DappSearchEmpty />
      )}
    </div>
  );
};
