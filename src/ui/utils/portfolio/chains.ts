import { WalletControllerType } from '../WalletContext';
import { CHAIN_ID_LIST, syncChainIdList } from 'consts';

export const fetchChainsData = async (wallet: WalletControllerType) => {
  try {
    syncChainIdList();
    const chains = await wallet.openapi.getChainList();
    for (const chain of chains) {
      const oldData = CHAIN_ID_LIST.get(chain.id);
      if (oldData) {
        CHAIN_ID_LIST.set(chain.id, {
          ...oldData,
          isSupportHistory: chain.is_support_history,
        });
      }
    }
  } catch (error) {
    console.error('fetchChainsData error', error);
  }
};
