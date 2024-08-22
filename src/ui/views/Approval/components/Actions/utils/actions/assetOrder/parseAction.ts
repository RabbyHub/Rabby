import { SwapOrderAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionAssetOrder: ParseAction<
  'transaction' | 'typed_data'
> = (options) => {
  const { data } = options;

  if (data?.type !== 'swap_order') {
    return {};
  }

  const {
    pay_token_list,
    pay_nft_list,
    receive_nft_list,
    receive_token_list,
    receiver,
    takers,
    expire_at,
  } = data.data as SwapOrderAction;
  return {
    assetOrder: {
      payTokenList: pay_token_list,
      payNFTList: pay_nft_list,
      receiveNFTList: receive_nft_list,
      receiveTokenList: receive_token_list,
      receiver,
      takers,
      expireAt: expire_at,
    },
  };
};
