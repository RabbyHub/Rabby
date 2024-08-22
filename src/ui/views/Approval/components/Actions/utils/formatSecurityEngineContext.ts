import { FormatSecurityEngineContext } from './types/formatSecurityEngineContext';
import { formatSecurityEngineApproveNFT } from './actions/approveNFT/formatSecurityEngine';
import { formatSecurityEngineApproveNFTCollection } from './actions/approveNFTCollection/formatSecurityEngine';
import { formatSecurityEngineApproveToken } from './actions/approveToken/formatSecurityEngine';
import { formatSecurityEngineAssetOrder } from './actions/assetOrder/formatSecurityEngine';
import { formatSecurityEngineCancelTx } from './actions/cancelTx/formatSecurityEngine';
import { formatSecurityEngineCommon } from './actions/common/formatSecurityEngine';
import { formatSecurityEngineContractCall } from './actions/contractCall/formatSecurityEngine';
import { formatSecurityEngineCrossSwapToken } from './actions/crossSwapToken/formatSecurityEngine';
import { formatSecurityEngineCrossToken } from './actions/crossToken/formatSecurityEngine';
import { formatSecurityEngineDeployContract } from './actions/deployContract/formatSecurityEngine';
import { formatSecurityEnginePushMultiSig } from './actions/pushMultiSig/formatSecurityEngine';
import { formatSecurityEngineRevokeNFT } from './actions/revokeNFT/formatSecurityEngine';
import { formatSecurityEngineRevokeNFTCollection } from './actions/revokeNFTCollection/formatSecurityEngine';
import { formatSecurityEngineRevokePermit2 } from './actions/revokePermit2/formatSecurityEngine';
import { formatSecurityEngineRevokeToken } from './actions/revokeToken/formatSecurityEngine';
import { formatSecurityEngineSend } from './actions/send/formatSecurityEngine';
import { formatSecurityEngineSendNFT } from './actions/sendNFT/formatSecurityEngine';
import { formatSecurityEngineSwap } from './actions/swap/formatSecurityEngine';
import { formatSecurityEngineUnwrapToken } from './actions/unwrapToken/formatSecurityEngine';
import { formatSecurityEngineWrapToken } from './actions/wrapToken/formatSecurityEngine';
import { formatSecurityEnginePermit2BatchRevokeToken } from './actions/permit2BatchRevokeToken/formatSecurityEngine';
import { formatSecurityEngineBatchPermit2 } from './actions/batchPermit2/formatSecurityEngine';
import { formatSecurityEngineBatchSellNFT } from './actions/batchSellNFT/formatSecurityEngine';
import { formatSecurityEngineBuyNFT } from './actions/buyNFT/formatSecurityEngine';
import { formatSecurityEngineCoboSafeCreate } from './actions/coboSafeCreate/formatSecurityEngine';
import { formatSecurityEngineCoboSafeModificationDelegatedAddress } from './actions/coboSafeModificationDelegatedAddress/formatSecurityEngine';
import { formatSecurityEngineCoboSafeModificationRole } from './actions/coboSafeModificationRole/formatSecurityEngine';
import { formatSecurityEngineCoboSafeModificationTokenApproval } from './actions/coboSafeModificationTokenApproval/formatSecurityEngine';
import { formatSecurityEngineCreateKey } from './actions/createKey/formatSecurityEngine';
import { formatSecurityEnginePermit } from './actions/permit/formatSecurityEngine';
import { formatSecurityEnginePermit2 } from './actions/permit2/formatSecurityEngine';
import { formatSecurityEngineRevokePermit } from './actions/revokePermit/formatSecurityEngine';
import { formatSecurityEngineSellNFT } from './actions/sellNFT/formatSecurityEngine';
import { formatSecurityEngineSignMultiSig } from './actions/signMultiSig/formatSecurityEngine';
import { formatSecurityEngineSwapTokenOrder } from './actions/swapTokenOrder/formatSecurityEngine';
import { formatSecurityEngineVerifyAddress } from './actions/verifyAddress/formatSecurityEngine';

export const formatSecurityEngineContext: FormatSecurityEngineContext = async (
  options
) => {
  const result = await Promise.all([
    formatSecurityEngineApproveNFT(options),
    formatSecurityEngineApproveNFTCollection(options),
    formatSecurityEngineApproveToken(options),
    formatSecurityEngineAssetOrder(options),
    formatSecurityEngineCancelTx(options),
    formatSecurityEngineCommon(options),
    formatSecurityEngineContractCall(options),
    formatSecurityEngineCrossSwapToken(options),
    formatSecurityEngineCrossToken(options),
    formatSecurityEngineDeployContract(options),
    formatSecurityEnginePushMultiSig(options),
    formatSecurityEngineRevokeNFT(options),
    formatSecurityEngineRevokeNFTCollection(options),
    formatSecurityEngineRevokePermit2(options),
    formatSecurityEngineRevokeToken(options),
    formatSecurityEngineSend(options),
    formatSecurityEngineSendNFT(options),
    formatSecurityEngineSwap(options),
    formatSecurityEngineUnwrapToken(options),
    formatSecurityEngineWrapToken(options),
    formatSecurityEnginePermit2BatchRevokeToken(options),
    formatSecurityEngineSellNFT(options),
    formatSecurityEngineBatchSellNFT(options),
    formatSecurityEngineSignMultiSig(options),
    formatSecurityEngineBuyNFT(options),
    formatSecurityEnginePermit(options),
    formatSecurityEnginePermit2(options),
    formatSecurityEngineBatchPermit2(options),
    formatSecurityEngineSwapTokenOrder(options),
    formatSecurityEngineCreateKey(options),
    formatSecurityEngineVerifyAddress(options),
    formatSecurityEngineCoboSafeCreate(options),
    formatSecurityEngineCoboSafeModificationDelegatedAddress(options),
    formatSecurityEngineCoboSafeModificationRole(options),
    formatSecurityEngineCoboSafeModificationTokenApproval(options),
    formatSecurityEngineRevokePermit(options),
  ]);

  return result.reduce((acc, val) => ({ ...acc, ...val }), {});
};
