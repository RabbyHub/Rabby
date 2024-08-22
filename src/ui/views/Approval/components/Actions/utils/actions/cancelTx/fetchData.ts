import { FetchActionRequiredData } from '../../types';

export const fetchDataCancelTx: FetchActionRequiredData = async (options) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { walletProvider, actionData, chainId, sender } = options;

  if (!actionData.cancelTx) {
    return {};
  }

  const chain = walletProvider.findChain({
    serverId: chainId,
  });
  if (chain) {
    const pendingTxs = await walletProvider.getPendingTxsByNonce(
      sender,
      chain.id,
      Number(actionData.cancelTx.nonce)
    );
    return {
      pendingTxs,
    };
  } else {
    return {
      pendingTxs: [],
    };
  }
};
