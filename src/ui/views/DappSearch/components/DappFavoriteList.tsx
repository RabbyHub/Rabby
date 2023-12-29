import React from 'react';
import { DappCard } from './DappCard';
import { range } from 'lodash';
import { ReactComponent as RcIconEmpty } from 'ui/assets/dapp-search/dapp-empty.svg';
import { BasicDappInfo } from '@rabby-wallet/rabby-api/dist/types';

const Empty = () => {
  return (
    <div className="rounded-[8px] pt-[22px] pb-[16px] text-center bg-r-neutral-card1">
      <RcIconEmpty className="mx-auto" />
      <div className="text-[12px] leading-[14px] text-r-neutral-foot mt-[8px]">
        No Favorite Dapp
      </div>
    </div>
  );
};

export const DappFavoriteList = ({
  data,
  onFavoriteChange,
}: {
  data?: BasicDappInfo[];
  onFavoriteChange?: (v: boolean, info: BasicDappInfo) => void;
}) => {
  return (
    <div>
      <div className="h-[32px] mb-[8px] flex items-center">
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          Favorites
        </div>
      </div>
      {data?.length ? (
        <div className="flex flex-col gap-[16px]">
          {data?.map((item) => {
            return (
              <DappCard
                key={item.id}
                data={item}
                isFavorite={true}
                onFavoriteChange={onFavoriteChange}
              />
            );
          })}
        </div>
      ) : (
        <Empty />
      )}
    </div>
  );
};
