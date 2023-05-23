import React, { useMemo } from 'react';
import Swap from './Swap';
import Send from './Send';
import TokenApprove from './TokenApprove';
import styled from 'styled-components';
import {
  ActionRequireData,
  ApproveTokenRequireData,
  ParsedActionData,
  SendRequireData,
  SwapRequireData,
} from './utils';
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
  background-color: #fff;
  border-radius: 8px;
  .action-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    background: #8697ff;
    padding: 14px;
    align-items: center;
    color: #fff;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    .left {
      font-weight: 500;
      font-size: 16px;
      line-height: 19px;
    }
    .right {
      font-size: 14px;
      line-height: 16px;
    }
  }
  .container {
    padding: 14px;
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
  }
`;

const Actions = ({
  data,
  requireData,
  chain,
  engineResults,
  txDetail,
  raw,
  onChange,
}: {
  data: ParsedActionData;
  requireData: ActionRequireData;
  chain: Chain;
  engineResults: Result[];
  txDetail: ExplainTxResponse;
  raw: Record<string, string | number>;
  onChange(tx: Record<string, any>): void;
}) => {
  const actionName = useMemo(() => {
    if (data.swap) {
      return 'Swap Token';
    }
    if (data.send) {
      return 'Send Token';
    }
    if (data.approveToken) {
      return 'Token Approval';
    }
  }, [data]);

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
        <div className="action-header">
          <div className="left">{actionName}</div>
          <div className="right">action type</div>
        </div>
        <div className="container">
          {data.swap && (
            <Swap
              data={data.swap}
              requireData={requireData as SwapRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data.send && (
            <Send
              data={data.send}
              requireData={requireData as SendRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data.approveToken && (
            <TokenApprove
              data={data.approveToken}
              requireData={requireData as ApproveTokenRequireData}
              chain={chain}
              engineResults={engineResults}
              onChange={onChange}
              raw={raw}
            />
          )}
          <BalanceChange
            version={txDetail.pre_exec_version}
            data={txDetail.balance_change}
            chainEnum={chain.enum}
            isSupport={txDetail.support_balance_change}
          />
        </div>
      </ActionWrapper>
    </>
  );
};

export default Actions;
