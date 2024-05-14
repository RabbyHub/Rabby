import { Result } from '@rabby-wallet/rabby-security-engine';
import { Chain, ExplainTxResponse } from 'background/service/openapi';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
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
import PushMultiSig from './PushMultiSig';
import CrossToken from './CrossToken';
import CrossSwapToken from './CrossSwapToken';
import RevokePermit2 from './RevokePermit2';
import AssetOrder from './AssetOrder';
import {
  ActionRequireData,
  ApproveNFTRequireData,
  ApproveTokenRequireData,
  CancelTxRequireData,
  ContractCallRequireData,
  ParsedActionData,
  PushMultiSigRequireData,
  RevokeNFTRequireData,
  RevokeTokenApproveRequireData,
  SendRequireData,
  SwapRequireData,
  WrapTokenRequireData,
  getActionTypeText,
  AssetOrderRequireData,
} from './utils';
import IconArrowRight, {
  ReactComponent as RcIconArrowRight,
} from 'ui/assets/approval/edit-arrow-right.svg';
import IconSpeedUp from 'ui/assets/sign/tx/speedup.svg';
import IconQuestionMark from 'ui/assets/sign/question-mark-24.svg';
import IconRabbyDecoded from 'ui/assets/sign/rabby-decoded.svg';
import IconCheck, {
  ReactComponent as RcIconCheck,
} from 'src/ui/assets/approval/icon-check.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';
import clsx from 'clsx';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { CommonAction } from '../CommonAction';
import { ActionWrapper } from '../ActionWrapper';
import { ContractRequireData } from '../TypedDataActions/utils';
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
    flex: 1;
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

const Actions = ({
  data,
  requireData,
  chain,
  engineResults,
  txDetail,
  raw,
  onChange,
  isSpeedUp,
  origin,
  originLogo,
}: {
  data: ParsedActionData;
  requireData: ActionRequireData;
  chain: Chain;
  engineResults: Result[];
  txDetail: ExplainTxResponse;
  raw: Record<string, string | number>;
  onChange(tx: Record<string, any>): void;
  isSpeedUp: boolean;
  origin?: string;
  originLogo?: string;
}) => {
  const actionName = useMemo(() => {
    return getActionTypeText(data);
  }, [data]);
  const { t } = useTranslation();

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: txDetail?.abi_str,
    });
  };

  const isUnknown = data?.contractCall;

  return (
    <>
      {/* <SignTitle>
        <div className="left relative">
          {isSpeedUp && (
            <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[max-content]"
              title={t('page.signTx.speedUpTooltip')}
            >
              <img src={IconSpeedUp} className="icon icon-speedup" />
            </TooltipWithMagnetArrow>
          )}
          {t('page.signTx.signTransactionOnChain', { chain: chain.name })}
        </div>
        <div
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('page.signTx.viewRaw')}
          <ThemeIcon className="icon icon-arrow-right" src={RcIconArrowRight} />
        </div>
      </SignTitle> */}
      <ActionWrapper>
        <Card>
          <OriginInfo
            chain={chain}
            origin={origin}
            originLogo={originLogo}
            engineResults={engineResults}
          />
          <BalanceChange
            version={txDetail.pre_exec_version}
            data={txDetail.balance_change}
          />
        </Card>

        <div
          className={clsx('action-header', {
            'is-unknown': isUnknown,
          })}
        >
          <div className="left">{actionName}</div>
          <div className="right">
            <TooltipWithMagnetArrow
              placement="bottom"
              overlayClassName="rectangle w-[max-content] decode-tooltip"
              title={
                isUnknown ? (
                  <NoActionAlert
                    data={{
                      chainId: chain.serverId,
                      contractAddress:
                        requireData && 'id' in requireData
                          ? requireData.id
                          : txDetail.type_call?.contract,
                      selector: raw.data.toString(),
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
              {isUnknown ? (
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
        <div className="container">
          {data.swap && (
            <Swap
              data={data.swap}
              requireData={requireData as SwapRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data.crossToken && (
            <CrossToken
              data={data.crossToken}
              requireData={requireData as SwapRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
          {data.crossSwapToken && (
            <CrossSwapToken
              data={data.crossSwapToken}
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
          {data.revokePermit2 && (
            <RevokePermit2
              data={data.revokePermit2}
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
          {data?.pushMultiSig && (
            <PushMultiSig
              data={data.pushMultiSig}
              requireData={requireData as PushMultiSigRequireData}
              chain={chain}
            />
          )}
          {data?.assetOrder && (
            <AssetOrder
              data={data.assetOrder}
              requireData={requireData as ContractRequireData}
              chain={chain}
              engineResults={engineResults}
              sender={(requireData as AssetOrderRequireData).sender}
            />
          )}
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
          {data.common && (
            <CommonAction
              data={data.common}
              requireData={requireData as ContractCallRequireData}
              chain={chain}
              engineResults={engineResults}
            />
          )}
        </div>
      </ActionWrapper>
    </>
  );
};

export default Actions;
