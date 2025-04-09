// import { createContextState } from '@/ui/hooks/contextState';
// import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { createContext, useContext } from 'react';

// export const [
//   TokenDetailInTokenSelectProvider,
//   useGetHandleTokenDetailInTokenSelect,
//   useSetHandleTokenDetailInTokenSelect,
// ] = createContextState<undefined | ((token: TokenItem) => void)>(undefined);
export const TokenDetailInTokenSelectProviderContext = createContext<
  undefined | ((token: TokenItem) => void)
>(undefined);

export const useGetHandleTokenSelectInTokenDetails = () =>
  useContext(TokenDetailInTokenSelectProviderContext);
