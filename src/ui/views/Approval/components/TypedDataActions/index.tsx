import { Result } from '@rabby-wallet/rabby-security-engine';
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
import Send from '../Actions/Send';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/question-mark.svg';
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
import RevokePermit2 from '../Actions/RevokePermit2';
import AssetOrder from '../Actions/AssetOrder';
import ApproveNFT from '../Actions/ApproveNFT';
import { CommonAction } from '../CommonAction';
import { ActionWrapper } from '../ActionWrapper';
import {
  ApproveNFTRequireData,
  RevokeTokenApproveRequireData,
  SendRequireData,
} from '../Actions/utils';
import { Chain } from '@debank/common';
import { OriginInfo } from '../OriginInfo';
import { Card } from '../Card';

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

const MessageWrapper = styled.div`
  .title {
    position: relative;
    display: flex;
    justify-content: center;
    margin-top: 12px;
    margin-bottom: 12px;

    .title-text {
      font-size: 12px;
      line-height: 14px;
      color: var(--r-neutral-foot, #6a7587);
      text-align: center;
      font-weight: 500;
      background: var(--r-neutral-bg1, #fff);
      padding: 0 8px;
      position: relative;
    }

    &::before {
      content: '';
      width: 100%;
      height: 1px;
      border-top: 1px dashed var(--r-neutral-line, rgba(255, 255, 255, 0.1));
      position: absolute;
      top: 50%;
      left: 0;
    }
  }
  .content {
    word-break: break-all;
    white-space: pre-wrap;
    background: var(--r-neutral-card-1, #ffffff);
    font-size: 13px;
    line-height: 16px;
    font-weight: 400;
    color: var(--r-neutral-body, #3e495e);
    height: 320px;
    overflow-y: auto;
    padding: 0 16px 16px;
    /* font-family: 'Roboto Mono'; */
  }
  &.no-action {
    .content {
      background: var(--r-neutral-card-1, #ffffff);
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
  originLogo,
}: {
  data: TypedDataActionData | null;
  requireData: TypedDataRequireData;
  chain?: Chain;
  engineResults: Result[];
  raw: Record<string, any>;
  message: string;
  origin: string;
  originLogo?: string;
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
  const isUnknown = (!data?.actionType && !data?.common) || data?.contractCall;

  return (
    <>
      <ActionWrapper>
        <Card>
          <OriginInfo
            chain={chain}
            origin={origin}
            originLogo={originLogo}
            engineResults={engineResults}
          />
        </Card>

        <Card>
          <div
            className={clsx('action-header', {
              'is-unknown': isUnknown,
            })}
          >
            <div className="left">
              <span>{actionName}</span>
              {isUnknown && (
                <TooltipWithMagnetArrow
                  placement="bottom"
                  overlayClassName="rectangle w-[max-content] decode-tooltip"
                  title={
                    <NoActionAlert
                      data={{
                        origin,
                        text: message,
                      }}
                    />
                  }
                >
                  <IconQuestionMark className="w-14 text-r-neutral-foot ml-2 mt-2" />
                </TooltipWithMagnetArrow>
              )}
            </div>
            <div className="right">
              <div
                className="float-right text-14 cursor-pointer flex items-center view-raw"
                onClick={handleViewRawClick}
              >
                {t('page.signTx.viewRaw')}
                <ThemeIcon
                  className="icon icon-arrow-right"
                  src={RcIconArrowRight}
                />
              </div>
            </div>
          </div>

          {chain?.isTestnet ? (
            <>
              <div className="p-[15px] whitespace-pre-wrap break-all overflow-y-auto text-[13px] leading-[16px] text-r-neutral-body h-[260px] font-medium">
                {JSON.stringify(raw, null, 2)}
              </div>
            </>
          ) : (
            <>
              {(data?.actionType || data?.actionType === null) && (
                <div className="container">
                  {data.permit && (
                    <Permit
                      data={data.permit}
                      requireData={requireData as ApproveTokenRequireData}
                      chain={chain}
                      engineResults={engineResults}
                    />
                  )}
                  {data.revokePermit && chain && (
                    <RevokePermit2
                      data={data.revokePermit}
                      requireData={requireData as RevokeTokenApproveRequireData}
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
                  {data.approveNFT && chain && (
                    <ApproveNFT
                      data={data.approveNFT}
                      requireData={requireData as ApproveNFTRequireData}
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
                  {data.assetOrder && chain && (
                    <AssetOrder
                      data={data.assetOrder}
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
                  {data.send && chain && (
                    <Send
                      data={data.send}
                      requireData={requireData as SendRequireData}
                      chain={chain}
                      engineResults={engineResults}
                    />
                  )}
                  {data.createKey && (
                    <CreateKey
                      data={data.createKey}
                      engineResults={engineResults}
                    />
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
                    <CoboSafeModificationRule
                      data={data.coboSafeModificationRole}
                    />
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
            </>
          )}
        </Card>
      </ActionWrapper>

      <Card className="mt-12">
        <MessageWrapper
          className={clsx({
            'no-action': !data,
          })}
        >
          <div className="title">
            <span className="title-text">
              {t('page.signTx.typedDataMessage')}
            </span>
          </div>
          <div className="content">{message}</div>
        </MessageWrapper>
      </Card>
    </>
  );
};

export default Actions;
