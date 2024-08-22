import { FetchActionRequiredData } from './types/fetchActionRequiredData';
import { fetchDataDeployContract } from './actions/deployContract/fetchData';
import { fetchDataSend } from './actions/send/fetchData';
import { fetchDataSendNFT } from './actions/sendNFT/fetchData';
import { fetchDataSwap } from './actions/swap/fetchData';
import { fetchDataCrossToken } from './actions/crossToken/fetchData';
import { fetchDataCrossSwapToken } from './actions/crossSwapToken/fetchData';
import { fetchDataApproveToken } from './actions/approveToken/fetchData';
import { fetchDataApproveNFT } from './actions/approveNFT/fetchData';
import { fetchDataCancelTx } from './actions/cancelTx/fetchData';
import { fetchDataContractCall } from './actions/contractCall/fetchData';
import { fetchDataRevokeNFT } from './actions/revokeNFT/fetchData';
import { fetchDataRevokePermit2 } from './actions/revokePermit2/fetchData';
import { fetchDataRevokeToken } from './actions/revokeToken/fetchData';
import { fetchDataWrapToken } from './actions/wrapToken/fetchData';
import { fetchDataUnwrapToken } from './actions/unwrapToken/fetchData';
import { fetchDataApproveNFTCollection } from './actions/approveNFTCollection/fetchData';
import { fetchDataAssetOrder } from './actions/assetOrder/fetchData';
import { fetchDataCommon } from './actions/common/fetchData';
import { fetchDataPushMultiSig } from './actions/pushMultiSig/fetchData';
import { fetchDataRevokeNFTCollection } from './actions/revokeNFTCollection/fetchData';
import { fetchDataPermit2BatchRevokeToken } from './actions/permit2BatchRevokeToken/fetchData';
import { fetchDataBatchPermit2 } from './actions/batchPermit2/fetchData';
import { fetchDataBatchSellNFT } from './actions/batchSellNFT/fetchData';
import { fetchDataBuyNFT } from './actions/buyNFT/fetchData';
import { fetchDataCoboSafeCreate } from './actions/coboSafeCreate/fetchData';
import { fetchDataCoboSafeModificationDelegatedAddress } from './actions/coboSafeModificationDelegatedAddress/fetchData';
import { fetchDataCoboSafeModificationRole } from './actions/coboSafeModificationRole/fetchData';
import { fetchDataCoboSafeModificationTokenApproval } from './actions/coboSafeModificationTokenApproval/fetchData';
import { fetchDataCreateKey } from './actions/createKey/fetchData';
import { fetchDataPermit } from './actions/permit/fetchData';
import { fetchDataPermit2 } from './actions/permit2/fetchData';
import { fetchDataRevokePermit } from './actions/revokePermit/fetchData';
import { fetchDataSellNFT } from './actions/sellNFT/fetchData';
import { fetchDataSignMultiSig } from './actions/signMultiSig/fetchData';
import { fetchDataSwapTokenOrder } from './actions/swapTokenOrder/fetchData';
import { fetchDataVerifyAddress } from './actions/verifyAddress/fetchData';

export const fetchActionRequiredData: FetchActionRequiredData = async (
  options
) => {
  const result = await Promise.all([
    fetchDataApproveNFT(options),
    fetchDataApproveNFTCollection(options),
    fetchDataApproveToken(options),
    fetchDataAssetOrder(options),
    fetchDataCancelTx(options),
    fetchDataCommon(options),
    fetchDataContractCall(options),
    fetchDataCrossSwapToken(options),
    fetchDataCrossToken(options),
    fetchDataDeployContract(options),
    fetchDataPushMultiSig(options),
    fetchDataRevokeNFT(options),
    fetchDataRevokeNFTCollection(options),
    fetchDataRevokePermit2(options),
    fetchDataRevokeToken(options),
    fetchDataSend(options),
    fetchDataSendNFT(options),
    fetchDataSwap(options),
    fetchDataUnwrapToken(options),
    fetchDataWrapToken(options),
    fetchDataPermit2BatchRevokeToken(options),
    fetchDataSellNFT(options),
    fetchDataBatchSellNFT(options),
    fetchDataSignMultiSig(options),
    fetchDataBuyNFT(options),
    fetchDataPermit(options),
    fetchDataPermit2(options),
    fetchDataBatchPermit2(options),
    fetchDataSwapTokenOrder(options),
    fetchDataCreateKey(options),
    fetchDataVerifyAddress(options),
    fetchDataCoboSafeCreate(options),
    fetchDataCoboSafeModificationDelegatedAddress(options),
    fetchDataCoboSafeModificationRole(options),
    fetchDataCoboSafeModificationTokenApproval(options),
    fetchDataRevokePermit(options),
  ]);

  return result.reduce((acc, val) => ({ ...acc, ...val }), {});
};
