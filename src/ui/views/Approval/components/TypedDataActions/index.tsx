import { Result } from '@rabby-wallet/rabby-security-engine';
import { Chain } from 'background/service/openapi';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import IconArrowRight, {
  ReactComponent as RcIconArrowRight,
} from 'ui/assets/approval/edit-arrow-right.svg';
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
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import IconQuestionMark from 'ui/assets/sign/question-mark-24.svg';
import IconRabbyDecoded from 'ui/assets/sign/rabby-decoded.svg';
import IconCheck, {
  ReactComponent as RcIconCheck,
} from 'src/ui/assets/approval/icon-check.svg';
import clsx from 'clsx';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import CoboSafeCreate from './CoboSafeCreate';
import CoboSafeModificationRule from './CoboSafeModificationRole';
import CoboSafeModificationDelegatedAddress from './CoboSafeModificationDelegatedAddress';
import CoboSafeModificationTokenApproval from './CoboSafeModificationTokenApproval';
import { CommonAction } from '../CommonAction';

export const SignTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  .left {
    display: flex;
    font-size: 18px;
    line-height: 21px;
    color: var(--r-neutral-title-1, #f7fafc);
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
  .action-header {
    display: flex;
    justify-content: space-between;
    background: var(--r-blue-default, #7084ff);
    padding: 13px;
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
      position: relative;
      .decode-tooltip {
        max-width: 358px;
        &:not(.ant-tooltip-hidden) {
          left: -321px !important;
          .ant-tooltip-arrow {
            left: 333px;
          }
        }
        .ant-tooltip-arrow-content {
          background-color: var(--r-neutral-bg-1, #fff);
        }
        .ant-tooltip-inner {
          background-color: var(--r-neutral-bg-1, #fff);
          padding: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--r-neutral-body, #3e495e);
          border-radius: 6px;
        }
      }
    }
    &.is-unknown {
      background: var(--r-neutral-foot, #6a7587);
    }
  }
  .container {
    padding: 14px;
    /* border: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1)); */
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    background-color: var(--r-neutral-card-1, rgba(255, 255, 255, 0.06));

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

const MessageWrapper = styled.div`
  .title {
    position: relative;
    font-size: 14px;
    line-height: 16px;
    color: var(--r-neutral-title-1, #f7fafc);
    text-align: center;
    margin-bottom: 10px;
    margin-left: -20px;
    margin-right: -20px;
    &::before {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed var(--r-neutral-line, rgba(255, 255, 255, 0.1));
      position: absolute;
      top: 50%;
      left: 0;
    }
    &::after {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed var(--r-neutral-line, rgba(255, 255, 255, 0.1));
      position: absolute;
      top: 50%;
      right: 0;
    }
  }
  .content {
    padding: 15px;
    word-break: break-all;
    white-space: pre-wrap;
    background: var(--r-neutral-card-1, #ffffff);
    border: 1px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    font-size: 13px;
    line-height: 16px;
    font-weight: 500;
    color: var(--r-neutral-body, #3e495e);
    height: 320px;
    overflow-y: auto;
    /* font-family: 'Roboto Mono'; */
  }
  &.no-action {
    .content {
      background: var(--r-neutral-card-3, rgba(255, 255, 255, 0.06));
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
  origin,
}: {
  data: TypedDataActionData | null;
  requireData: TypedDataRequireData;
  chain?: Chain;
  engineResults: Result[];
  raw: Record<string, any>;
  message: string;
  origin: string;
}) => {
  const { t } = useTranslation();

  const actionName = useMemo(() => {
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
          {t('page.signTypedData.signTypeDataOnChain', {
            chain: chain ? chain.name : '',
          })}
        </div>
        <div
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('page.signTx.viewRaw')}
          <ThemeIcon className="icon icon-arrow-right" src={RcIconArrowRight} />
        </div>
      </SignTitle>

      <ActionWrapper>
        <div
          className={clsx('action-header', {
            'is-unknown':
              (!data?.actionType && !data?.common) || data.contractCall,
          })}
        >
          <div className="left flex items-center">
            {data?.brand ? (
              <img
                src={data?.brand?.logo_url}
                title={data?.brand?.name}
                className="mr-8 w-20 h-20 rounded-full object-cover"
              />
            ) : null}
            <span>{actionName}</span>
          </div>
          <div className="right">
            <TooltipWithMagnetArrow
              placement="bottom"
              overlayClassName="rectangle w-[max-content] decode-tooltip"
              title={
                !data?.actionType || data?.contractCall ? (
                  <NoActionAlert
                    data={{
                      origin,
                      text: message,
                    }}
                  />
                ) : (
                  <span className="flex w-[358px] p-12 items-center">
                    <ThemeIcon src={RcIconCheck} className="mr-4 w-12" />
                    {t('page.signTx.decodedTooltip')}
                  </span>
                )
              }
            >
              {!data?.actionType || data?.contractCall ? (
                <img src={IconQuestionMark} className="w-24" />
              ) : (
                <img
                  src={IconRabbyDecoded}
                  className="icon icon-rabby-decoded"
                />
              )}
            </TooltipWithMagnetArrow>
          </div>
        </div>
        {data?.actionType && (
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
            {data.coboSafeCreate && (
              <CoboSafeCreate data={data.coboSafeCreate} />
            )}
            {data.coboSafeModificationRole && (
              <CoboSafeModificationRule data={data.coboSafeModificationRole} />
            )}
            {data.coboSafeModificationDelegatedAddress && (
              <CoboSafeModificationDelegatedAddress
                data={data.coboSafeModificationDelegatedAddress}
              />
            )}
            {data.coboSafeModificationTokenApproval && (
              <CoboSafeModificationTokenApproval
                data={data.coboSafeModificationTokenApproval}
              />
            )}
            {data.common && (
              <CommonAction
                data={data.common}
                requireData={requireData as ContractRequireData}
                chain={chain}
                engineResults={engineResults}
              />
            )}
          </div>
        )}
      </ActionWrapper>
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
