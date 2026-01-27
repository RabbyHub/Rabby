import { AbstractPortfolioToken } from './types';

// lpTokenMode is false
export const defaultTokenFilter = (token: AbstractPortfolioToken) => {
  // null和false是两种情况，null表示没处理，false已经明确是诈骗token
  if (token.is_verified === false || token.is_suspicious) {
    return false;
  }
  if (token.is_core === false) {
    return false;
  }
  if (!token.is_core && token.protocol_id) {
    return false;
  }
  return true;
};

// lpTokenMode is true
export const includeLpTokensFilter = (token: AbstractPortfolioToken) => {
  if (token.is_verified === false || token.is_suspicious) {
    return false;
  }
  if (token.is_core === false && !token.protocol_id) {
    return false;
  }
  return true;
};

interface IsLpTokenProps {
  is_verified?: boolean | null;
  is_core?: boolean | null;
  protocol_id?: string;
}
export const isLpToken = (token: IsLpTokenProps) => {
  return token.is_verified !== false && !token.is_core && !!token.protocol_id;
};
