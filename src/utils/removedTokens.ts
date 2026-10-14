import type { RemovedToken } from '@/background/service/removedTokens';

export const getRemovedTokenKey = (token: RemovedToken) =>
  `${token.chain.toLowerCase()}:${token.tokenId.toLowerCase()}`;
