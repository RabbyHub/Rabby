import { Result } from '@rabby-wallet/rabby-security-engine';
import { Chain } from 'background/service/openapi';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import ViewRawModal from '../TxComponents/ViewRawModal';
import {
  ApproveTokenRequireData,
  ContractRequireData,
  MultiSigRequireData,
  SwapTokenOrderRequireData,
  TypedDataActionData,
  TypedDataRequireData,
  getActionTypeText,
  BatchApproveTokenRequireData,
} from './utils';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import BuyNFT from './BuyNFT';
import SellNFT from './SellNFT';
import Permit from './Permit';
import Permit2 from './Permit2';
import ContractCall from './ContractCall';
import SwapTokenOrder from './SwapTokenOrder';
import SignMultisig from './SignMultisig';
import CreateKey from '../TextActions/CreateKey';
import VerifyAddress from '../TextActions/VerifyAddress';
import BatchSellNFT from './BatchSellNFT';
import BatchPermit2 from './BatchPermit2';
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import IconAlert from 'ui/assets/sign/tx/alert.svg';
import clsx from 'clsx';

export const SignTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  .left {
    display: flex;
    font-size: 18px;
    line-height: 21px;
    color: #333333;
    .icon-speedup {
      width: 10px;
      margin-right: 6px;
      cursor: pointer;
    }
  }
  .right {
    font-size: 14px;
    line-height: 16px;
    color: #999999;
    cursor: pointer;
  }
`;

export const ActionWrapper = styled.div`
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #fff;
  .action-header {
    display: flex;
    justify-content: space-between;
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
      .icon-tip {
        margin-top: 1px;
        margin-left: 4px;
        path {
          stroke: #fff;
        }
      }
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

const NoActionAlert = styled.div`
  display: flex;
  align-items: flex-start;
  background: #e8eaf3;
  border-radius: 6px;
  padding: 15px;
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  color: #333333;
  margin-bottom: 15px;
  .icon-alert {
    margin-right: 8px;
    width: 15px;
    margin-top: 1px;
  }
`;

const MessageWrapper = styled.div`
  .title {
    position: relative;
    font-size: 14px;
    line-height: 16px;
    color: #666666;
    text-align: center;
    margin-bottom: 10px;
    margin-left: -20px;
    margin-right: -20px;
    &::before {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed #c7c9d7;
      position: absolute;
      top: 50%;
      left: 0;
    }
    &::after {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed #c7c9d7;
      position: absolute;
      top: 50%;
      right: 0;
    }
  }
  .content {
    padding: 15px;
    word-break: break-all;
    white-space: pre-wrap;
    background: #ebedf7;
    border: 1px solid rgba(225, 227, 234, 0.9);
    border-radius: 6px;
    font-size: 13px;
    line-height: 16px;
    font-weight: 500;
    color: #4b4d59;
    height: 320px;
    overflow-y: auto;
    font-family: 'Roboto Mono';
  }
  &.no-action {
    .content {
      background-color: #fff;
    }
  }
`;

const Actions = ({
  data,
  requireData,
  chain,
  engineResults,
  raw,
  message,
}: {
  data: TypedDataActionData | null;
  requireData: TypedDataRequireData;
  chain?: Chain;
  engineResults: Result[];
  raw: Record<string, any>;
  message: string;
}) => {
  const actionName = useMemo(() => {
    if (!data) return '';
    return getActionTypeText(data);
  }, [data]);

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
    });
  };

  return (
    <>
      <SignTitle>
        <div className="left relative">
          Sign{chain ? ` ${chain.name}` : ''} Typed Data
        </div>
        <div
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          View Raw
          <img className="icon icon-arrow-right" src={IconArrowRight} />
        </div>
      </SignTitle>
      {data && (
        <ActionWrapper>
          <div className="action-header">
            <div className="left">{actionName}</div>
            <div className="right">
              {data.contractCall ? (
                <span className="flex items-center relative">
                  Unknown action type{' '}
                  <TooltipWithMagnetArrow
                    overlayClassName="rectangle w-[max-content]"
                    title="This signature can't be decoded by Rabby, but it doesn't imply any risk"
                    placement="top"
                  >
                    <IconQuestionMark className="icon icon-tip" />
                  </TooltipWithMagnetArrow>
                </span>
              ) : (
                'action type'
              )}
            </div>
          </div>
          <div className="container">
            {data.permit && chain && (
              <Permit
                data={data.permit}
                requireData={requireData as ApproveTokenRequireData}
                chain={chain}
                engineResults={engineResults}
              />
            )}
            {data.permit2 && chain && (
              <Permit2
                data={data.permit2}
                requireData={requireData as ApproveTokenRequireData}
                chain={chain}
                engineResults={engineResults}
              />
            )}
            {data.batchPermit2 && chain && (
              <BatchPermit2
                data={data.batchPermit2}
                requireData={requireData as BatchApproveTokenRequireData}
                chain={chain}
                engineResults={engineResults}
              />
            )}
            {data.swapTokenOrder && chain && (
              <SwapTokenOrder
                data={data.swapTokenOrder}
                requireData={requireData as SwapTokenOrderRequireData}
                chain={chain}
                engineResults={engineResults}
              />
            )}
            {data.buyNFT && chain && (
              <BuyNFT
                data={data.buyNFT}
                requireData={requireData as ContractRequireData}
                chain={chain}
                engineResults={engineResults}
                sender={data.sender}
              />
            )}
            {data.batchSellNFT && chain && (
              <BatchSellNFT
                data={data.batchSellNFT}
                requireData={requireData as ContractRequireData}
                chain={chain}
                engineResults={engineResults}
                sender={data.sender}
              />
            )}
            {data.sellNFT && chain && (
              <SellNFT
                data={data.sellNFT}
                requireData={requireData as ContractRequireData}
                chain={chain}
                engineResults={engineResults}
                sender={data.sender}
              />
            )}
            {data.signMultiSig && (
              <SignMultisig
                data={data.signMultiSig}
                requireData={requireData as MultiSigRequireData}
                chain={chain}
                engineResults={engineResults}
              />
            )}
            {data.createKey && (
              <CreateKey data={data.createKey} engineResults={engineResults} />
            )}
            {data.verifyAddress && (
              <VerifyAddress
                data={data.verifyAddress}
                engineResults={engineResults}
              />
            )}
            {data.contractCall && chain && (
              <ContractCall
                data={data.permit}
                requireData={requireData as ContractRequireData}
                chain={chain}
                engineResults={engineResults}
                raw={raw}
              />
            )}
          </div>
        </ActionWrapper>
      )}
      {!data && (
        <NoActionAlert>
          <img src={IconAlert} className="icon icon-alert" />
          This signature can't be decoded by Rabby, but it doesn't imply any
          risk
        </NoActionAlert>
      )}
      <MessageWrapper
        className={clsx({
          'no-action': !data,
        })}
      >
        <div className="title">Message</div>
        <div className="content">{message}</div>
      </MessageWrapper>
    </>
  );
};

export default Actions;
