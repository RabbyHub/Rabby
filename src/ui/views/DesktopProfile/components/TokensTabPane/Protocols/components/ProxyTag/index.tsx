import React from 'react';

import { HelperTooltip } from '../HelperTooltip';

import styled from 'styled-components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

const PanelSubTag = styled.div`
  margin-left: 8px;
  height: 24px;
  line-height: 24px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 4px 8px;
  background-color: var(--r-neutral-card2);
  color: var(--r-neutral-title1);
`;

export const ProxyTag = ({ item }: { item: PortfolioItem }) => {
  if (!item.proxy_detail?.proxy_contract_id) {
    return null;
  }

  return (
    <HelperTooltip title={item.proxy_detail?.proxy_contract_id}>
      <PanelSubTag>
        Proxy:
        {item.proxy_detail?.project?.name}
      </PanelSubTag>
    </HelperTooltip>
  );
};
