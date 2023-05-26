import { Result } from '@debank/rabby-security-engine';
import { Chain, ExplainTxResponse } from 'background/service/openapi';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import BalanceChange from '../TxComponents/BalanceChange';
import ViewRawModal from '../TxComponents/ViewRawModal';
import ApproveNFT from './ApproveNFT';
import ApproveNFTCollection from './ApproveNFTCollection';
import CancelTx from './CancelTx';
import ContractCall from './ContractCall';
import DeployContract from './DeployContract';
import RevokeNFT from './RevokeNFT';
import RevokeNFTCollection from './RevokeNFTCollection';
import Send from './Send';
import SendNFT from './SendNFT';
import Swap from './Swap';
import TokenApprove from './TokenApprove';
import RevokeTokenApprove from './RevokeTokenApprove';
import WrapToken from './WrapToken';
import UnWrapToken from './UnWrapToken';
import {
  ActionRequireData,
  ApproveNFTRequireData,
  ApproveTokenRequireData,
  CancelTxRequireData,
  ContractCallRequireData,
  ParsedActionData,
  RevokeNFTRequireData,
  RevokeTokenApproveRequireData,
  SendRequireData,
  SwapRequireData,
  WrapTokenRequireData,
} from './utils';

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
    if (data.wrapToken) {
      return 'Wrap Token';
    }
    if (data.unWrapToken) {
      return 'Unwrap Token';
    }
    if (data.send) {
      return 'Send Token';
    }
    if (data.approveToken) {
      return 'Token Approval';
    }
    if (data.revokeToken) {
      return 'Revoke Token Approval';
    }
    if (data.sendNFT) {
      return 'Send NFT';
    }
    if (data.approveNFT) {
      return 'NFT Approval';
    }
    if (data.revokeNFT) {
      return 'Revoke NFT Approval';
    }
    if (data.approveNFTCollection) {
      return 'NFT Collection Approval';
    }
    if (data.revokeNFTCollection) {
      return 'Revoke NFT Collection Approval';
    }
    if (data.deployContract) {
      return 'Deploy a Contract';
    }
    if (data.cancelTx) {
      return 'Cancel Pending Transaction';
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
        {!data.contractCall && (
          <div className="action-header">
            <div className="left">{actionName}</div>
            <div className="right">action type</div>
          </div>
        )}
        <div className="container">
          {data.swap && (
            <Swap
              data={data.swap}
              requireData={requireData as SwapRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data.wrapToken && (
            <WrapToken
              data={data.wrapToken}
              requireData={requireData as WrapTokenRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data.unWrapToken && (
            <UnWrapToken
              data={data.unWrapToken}
              requireData={requireData as WrapTokenRequireData}
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
          {data.revokeToken && (
            <RevokeTokenApprove
              data={data.revokeToken}
              requireData={requireData as RevokeTokenApproveRequireData}
              chain={chain}
              engineResults={engineResults}
              onChange={onChange}
              raw={raw}
            />
          )}
          {data.cancelTx && (
            <CancelTx
              data={data.cancelTx}
              requireData={requireData as CancelTxRequireData}
              chain={chain}
              engineResults={engineResults}
              onChange={onChange}
              raw={raw}
            ></CancelTx>
          )}
          {data?.sendNFT && (
            <SendNFT
              data={data.sendNFT}
              requireData={requireData as SendRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data?.approveNFT && (
            <ApproveNFT
              data={data.approveNFT}
              requireData={requireData as ApproveNFTRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data?.revokeNFT && (
            <RevokeNFT
              data={data.revokeNFT}
              requireData={requireData as RevokeNFTRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data?.revokeNFTCollection && (
            <RevokeNFTCollection
              data={data.revokeNFTCollection}
              requireData={requireData as RevokeNFTRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data?.approveNFTCollection && (
            <ApproveNFTCollection
              data={data.approveNFTCollection}
              requireData={requireData as RevokeNFTRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data?.deployContract && <DeployContract />}
          {data.contractCall && (
            <ContractCall
              data={data.contractCall}
              requireData={requireData as ContractCallRequireData}
              chain={chain}
              engineResults={engineResults}
              onChange={onChange}
              raw={raw}
            />
          )}
          <BalanceChange
            version={txDetail.pre_exec_version}
            data={txDetail.balance_change}
          />
        </div>
      </ActionWrapper>
    </>
  );
};

export default Actions;
