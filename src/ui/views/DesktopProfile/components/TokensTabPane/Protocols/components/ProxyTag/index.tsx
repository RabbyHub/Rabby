import React from 'react';

import { HelperTooltip } from '../HelperTooltip';

import styled from 'styled-components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

const PanelSubTag = styled.div`
  margin-left: 8px;
  height: 24px;
  line-height: 24px;
`;

export const ProxyTag = ({ item }: { item: PortfolioItem }) => {
  if (!item.proxy_detail?.proxy_contract_id) {
    return null;
  }

  return (
    <HelperTooltip title={item.proxy_detail?.proxy_contract_id}>
      {/* TODO: 样式 */}
      <PanelSubTag>
        Proxy:
        {item.proxy_detail?.project?.name}
      </PanelSubTag>
    </HelperTooltip>
  );
};
