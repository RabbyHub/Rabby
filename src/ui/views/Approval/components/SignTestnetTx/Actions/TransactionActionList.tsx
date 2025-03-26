import { Chain } from '@debank/common';
import {
  ActionRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import React from 'react';
import { TestnetSendAction } from './Send';
import { TestnetUnknownAction } from './UnknownAction';
import { TestnetTokenApprove } from './TokenApprove';

export const TestnetTransactionActionList: React.FC<{
  data: ParsedTransactionActionData;
  requireData?: ActionRequireData;
  chain: Chain;
  raw: Record<string, string | number>;
  isTypedData?: boolean;
  onChange?(tx: Record<string, any>): void;
}> = ({ data, requireData, chain, onChange, raw, isTypedData = false }) => {
  return (
    <>
      {/* {data.crossToken && (
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
      )} */}
      {data.send ? (
        <TestnetSendAction data={data.send} chain={chain} />
      ) : data.approveToken ? (
        <TestnetTokenApprove
          data={data.approveToken}
          chain={chain}
          raw={raw}
          onChange={onChange}
        />
      ) : (
        <TestnetUnknownAction chain={chain} raw={raw} />
      )}
      {/* {data.approveToken && (
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
      {data?.transferOwner && (
        <TransferOwner
          data={data.transferOwner}
          requireData={requireData as TransferOwnerRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data?.multiSwap && (
        <MultiSwap
          data={data.multiSwap}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
          sender={(requireData as SwapRequireData).sender}
        />
      )}
      {data?.swapLimitPay && (
        <SwapLimitPay
          data={data.swapLimitPay}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
          sender={(requireData as SwapRequireData).sender}
        />
      )}
      {!isTypedData && data.contractCall && (
        <ContractCall
          data={data.contractCall}
          requireData={requireData as ContractCallRequireData}
          chain={chain}
          engineResults={engineResults}
          onChange={onChange}
          raw={raw}
        />
      )}
      {!isTypedData && data.common && (
        <CommonAction
          data={data.common}
          requireData={requireData as ContractCallRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.permit2BatchRevokeToken && (
        <BatchRevokePermit2
          data={data.permit2BatchRevokeToken}
          requireData={requireData as BatchRevokePermit2RequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )} */}
    </>
  );
};
