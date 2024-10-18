import { Result } from '@rabby-wallet/rabby-security-engine';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ViewRawModal from '../TxComponents/ViewRawModal';
import {
  ApproveTokenRequireData,
  ContractRequireData,
  MultiSigRequireData,
  SwapTokenOrderRequireData,
  BatchApproveTokenRequireData,
  ActionRequireData,
  ParsedTypedDataActionData,
} from '@rabby-wallet/rabby-action';
import { getActionTypeText } from './utils';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
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
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/question-mark.svg';
import clsx from 'clsx';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import CoboSafeCreate from './CoboSafeCreate';
import CoboSafeModificationRule from './CoboSafeModificationRole';
import CoboSafeModificationDelegatedAddress from './CoboSafeModificationDelegatedAddress';
import CoboSafeModificationTokenApproval from './CoboSafeModificationTokenApproval';
import { CommonAction } from '../CommonAction';
import { ActionWrapper } from '../ActionWrapper';
import { CHAINS, CHAINS_ENUM, Chain } from '@debank/common';
import { OriginInfo } from '../OriginInfo';
import { Card } from '../Card';
import { MessageWrapper } from '../TextActions';
import { Divide } from '../Divide';
import { Col, Row } from '../Actions/components/Table';
import LogoWithText from '../Actions/components/LogoWithText';
import { TransactionActionList } from '../Actions/components/TransactionActionList';
import { noop } from '@/ui/utils';
import { BalanceChangeWrapper } from '../TxComponents/BalanceChangeWrapper';
import { ParseCommonResponse } from '@rabby-wallet/rabby-api/dist/types';

const Actions = ({
  data,
  requireData,
  chain = CHAINS[CHAINS_ENUM.ETH],
  engineResults,
  raw,
  message,
  origin,
  originLogo,
  typedDataActionData,
}: {
  data: ParsedTypedDataActionData | null;
  requireData: ActionRequireData;
  chain?: Chain;
  engineResults: Result[];
  raw: Record<string, any>;
  message: string;
  origin: string;
  originLogo?: string;
  typedDataActionData?: ParseCommonResponse | null;
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
          <BalanceChangeWrapper
            data={data}
            balanceChange={typedDataActionData?.pre_exec_result?.balance_change}
            preExecSuccess={typedDataActionData?.pre_exec?.success}
            preExecVersion={
              typedDataActionData?.pre_exec_result?.pre_exec_version
            }
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
                  inApproval
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
                className="float-right text-13 cursor-pointer flex items-center view-raw"
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

          {data && <Divide />}

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
                  {chain && (
                    <Col>
                      <Row isTitle>{t('page.signTx.chain')}</Row>
                      <Row>
                        <LogoWithText
                          logo={chain.logo}
                          text={chain.name}
                          logoRadius="100%"
                        />
                      </Row>
                    </Col>
                  )}

                  {data.permit && (
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
                  {chain && (
                    <TransactionActionList
                      data={data}
                      requireData={requireData}
                      chain={chain}
                      engineResults={engineResults}
                      raw={raw}
                      isTypedData
                      onChange={noop}
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
