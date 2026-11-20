import React from 'react';

import { HelperTooltip } from '../HelperTooltip';

import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

export const ProxyTag = ({ item }: { item: PortfolioItem }) => {
  if (!item.proxy_detail?.proxy_contract_id) {
    return null;
  }

  return (
    <HelperTooltip title={item.proxy_detail?.proxy_contract_id}>
      <div className="ml-8 h-24 leading-[24px] text-[12px] font-medium flex items-center justify-center rounded-[4px] py-4 px-8 bg-r-neutral-card2 text-r-neutral-title1">
        Proxy:
        {item.proxy_detail?.project?.name}
      </div>
    </HelperTooltip>
  );
};
