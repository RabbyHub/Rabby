import { AbstractPortfolioToken } from './types';

// lpTokenMode is false
export const defaultTokenFilter = (token: AbstractPortfolioToken) => {
  if (!token.is_verified) {
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
  if (!token.is_verified) {
    return false;
  }
  if (token.is_core === false && !token.protocol_id) {
    return false;
  }
  return true;
};

export const isLpToken = (token: AbstractPortfolioToken) => {
  return !!token.is_verified && !token.is_core && !!token.protocol_id;
};
