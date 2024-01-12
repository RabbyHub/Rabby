import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { BasicDappInfo } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconEmpty } from 'ui/assets/dapp-search/dapp-empty.svg';
import { DappCard } from './DappCard';

const Empty = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-[8px] pt-[22px] pb-[16px] text-center bg-r-neutral-card1">
      <ThemeIcon src={RcIconEmpty} className="mx-auto"></ThemeIcon>
      <div className="text-[12px] leading-[14px] text-r-neutral-foot mt-[8px]">
        {t('page.dappSearch.emptyFavorite')}
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
  const { t } = useTranslation();
  return (
    <div>
      <div className="h-[32px] mb-[8px] flex items-center">
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          {t('page.dappSearch.favorite')}
        </div>
      </div>
      {data?.length ? (
        <div className="flex flex-col gap-[12px]">
          {data?.map((item) => {
            return (
              <DappCard
                size="small"
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
