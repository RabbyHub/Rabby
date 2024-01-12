import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconEmpty } from 'ui/assets/dapp-search/dapp-search-empty.svg';

export const DappSearchEmpty = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-[8px] pt-[65px] pb-[83px] text-center bg-r-neutral-card1">
      <ThemeIcon src={RcIconEmpty} className="mx-auto" />
      <div className="text-[15px] leading-[18px] text-r-neutral-foot mt-[25px]">
        {t('page.dappSearch.emptySearch')}
      </div>
    </div>
  );
};
