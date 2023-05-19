import React, { useMemo } from 'react';
import Swap from './Swap';
import styled from 'styled-components';
import { ActionRequireData, ParsedActionData, SwapRequireData } from './utils';
import { Chain, ExplainTxResponse } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import BalanceChange from '../TxComponents/BalanceChange';
import ViewRawModal from '../TxComponents/ViewRawModal';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';

const SignTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  .left {
    font-size: 18px;
    line-height: 21px;
    color: #333333;
  }
  .right {
    font-size: 14px;
    line-height: 16px;
    color: #999999;
    cursor: pointer;
  }
`;

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
  txDetail,
  raw,
}: {
  data: ParsedActionData;
  requireData: ActionRequireData;
  chain: Chain;
  engineResults: Result[];
  txDetail: ExplainTxResponse;
  raw: Record<string, string | number>;
}) => {
  const actionName = useMemo(() => {
    // TODO: 完善逻辑
    return 'Swap Token';
  }, []);

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: txDetail?.abi_str,
    });
  };

  return (
    <>
      <SignTitle>
        <div className="left">Sign {chain.name} Transaction</div>
        <div
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          View Raw
          <img className="icon icon-arrow-right" src={IconArrowRight} />
        </div>
      </SignTitle>
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
        <BalanceChange
          version={txDetail.pre_exec_version}
          data={txDetail.balance_change}
          chainEnum={chain.enum}
          isSupport={txDetail.support_balance_change}
        />
      </ActionWrapper>
    </>
  );
};

export default Actions;
