import i18n from '@/i18n';
import { ParsedTransactionActionData } from '@rabby-wallet/rabby-action';

export const getActionTypeText = (data: ParsedTransactionActionData) => {
  const t = i18n.t;

  if (data.swap) {
    return t('page.signTx.swap.title');
  }
  if (data.crossToken) {
    return t('page.signTx.crossChain.title');
  }
  if (data.crossSwapToken) {
    return t('page.signTx.swapAndCross.title');
  }
  if (data.wrapToken) {
    return t('page.signTx.wrapToken');
  }
  if (data.unWrapToken) {
    return t('page.signTx.unwrap');
  }
  if (data.send) {
    return t('page.signTx.send.title');
  }
  if (data.approveToken) {
    return t('page.signTx.tokenApprove.title');
  }
  if (data.revokeToken) {
    return t('page.signTx.revokeTokenApprove.title');
  }
  if (data.sendNFT) {
    return t('page.signTx.sendNFT.title');
  }
  if (data.approveNFT) {
    return t('page.signTx.nftApprove.title');
  }
  if (data.revokeNFT) {
    return t('page.signTx.revokeNFTApprove.title');
  }
  if (data.approveNFTCollection) {
    return t('page.signTx.nftCollectionApprove.title');
  }
  if (data.revokeNFTCollection) {
    return t('page.signTx.revokeNFTCollectionApprove.title');
  }
  if (data.deployContract) {
    return t('page.signTx.deployContract.title');
  }
  if (data.cancelTx) {
    return t('page.signTx.cancelTx.title');
  }
  if (data.pushMultiSig) {
    return t('page.signTx.submitMultisig.title');
  }
  if (data.contractCall) {
    return t('page.signTx.unknownAction');
  }
  if (data.revokePermit2) {
    return t('page.signTx.revokePermit2.title');
  }
  if (data.assetOrder) {
    return t('page.signTx.assetOrder.title');
  }
  if (data?.common) {
    return data.common.title;
  }
  if (data.permit2BatchRevokeToken) {
    return t('page.signTx.batchRevokePermit2.title');
  }
  return t('page.signTx.unknownAction');
};

export const getActionTypeTextByType = (type: string) => {
  const t = i18n.t;

  const dict = {
    swap_token: t('page.signTx.swap.title'),
    cross_token: t('page.signTx.crossChain.title'),
    cross_swap_token: t('page.signTx.swapAndCross.title'),
    send_token: t('page.signTx.send.title'),
    approve_token: t('page.signTx.tokenApprove.title'),
    revoke_token: t('page.signTx.revokeTokenApprove.title'),
    permit2_revoke_token: t('page.signTx.revokePermit2.title'),
    wrap_token: t('page.signTx.wrapToken'),
    unwrap_token: t('page.signTx.unwrap'),
    send_nft: t('page.signTx.sendNFT.title'),
    approve_nft: t('page.signTx.nftApprove.title'),
    revoke_nft: t('page.signTx.revokeNFTApprove.title'),
    approve_collection: t('page.signTx.nftCollectionApprove.title'),
    revoke_collection: t('page.signTx.revokeNFTCollectionApprove.title'),
    deploy_contract: t('page.signTx.deployContract.title'),
    cancel_tx: t('page.signTx.cancelTx.title'),
    push_multisig: t('page.signTx.submitMultisig.title'),
    contract_call: t('page.signTx.contractCall.title'),
    swap_order: t('page.signTx.assetOrder.title'),
    permit2_batch_revoke_token: t('page.signTx.batchRevokePermit2.title'),
  };

  return dict[type] || t('page.signTx.unknownAction');
};
