import { Chain } from '@/types/chain';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const GnosisChainList = ({
  chainList,
  className,
}: {
  chainList?: Chain[];
  className?: string;
}) => {
  const { t } = useTranslation();
  return chainList?.length ? (
    <div className={className}>
      <div className="desc text-left font-normal text-[13px] leading-[15px] text-r-neutral-body mb-12">
        {t('page.importSafe.gnosisChainDesc', {
          count: chainList?.length,
        })}
      </div>
      <div className="chain-list flex flex-wrap gap-y-20 gap-x-12">
        {chainList?.map((chain) => {
          return (
            <div
              className="chain-list-item flex items-center gap-6 font-medium text-[13px] leading-[15px] text-r-neutral-title-1"
              key={chain.id}
            >
              <img
                src={chain.logo}
                alt=""
                className="chain-logo w-20 h-20 rounded-[50%]"
              />
              {chain.name}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;
};
