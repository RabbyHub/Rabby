import React, { useMemo } from 'react';
import Swap from './Swap';
import styled from 'styled-components';
import { ActionRequireData, ParsedActionData, SwapRequireData } from './utils';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';

const ActionWrapper = styled.div`
  padding: 14px;
  background-color: #fff;
  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    .left {
      font-weight: 500;
      font-size: 16px;
      line-height: 19px;
      color: #222222;
    }
    .right {
      font-size: 14px;
      line-height: 16px;
      color: #999999;
    }
  }
`;

const Actions = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData;
  requireData: ActionRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionName = useMemo(() => {
    // TODO: 完善逻辑
    return 'Swap Token';
  }, []);
  return (
    <ActionWrapper>
      <div className="header">
        <div className="left">{actionName}</div>
        <div className="right">action type</div>
      </div>
      {data.swap && (
        <Swap
          data={data.swap}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
    </ActionWrapper>
  );
};

export default Actions;
