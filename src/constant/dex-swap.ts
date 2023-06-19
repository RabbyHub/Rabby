import {
  DEX_SUPPORT_CHAINS as RS_DEX_SUPPORT_CHAINS,
  DEX_ROUTER_WHITELIST as RS_DEX_ROUTER_WHITELIST,
  DEX_SPENDER_WHITELIST as RS_DEX_SPENDER_WHITELIST,
} from '@rabby-wallet/rabby-swap';
import { ensureChainHashValid, findChainByEnum } from '@/utils/chain';

export const DEX_SUPPORT_CHAINS = Object.entries(RS_DEX_SUPPORT_CHAINS).reduce(
  (accu, [dexItem, value]) => {
    accu[dexItem] = value.filter((chainEnum) => findChainByEnum(chainEnum));
    return accu;
  },
  {} as typeof RS_DEX_SUPPORT_CHAINS
);
export const DEX_ROUTER_WHITELIST = Object.entries(
  RS_DEX_ROUTER_WHITELIST
).reduce((accu, [dexItem, value]) => {
  accu[dexItem] = ensureChainHashValid(value);
  return accu;
}, {} as typeof RS_DEX_ROUTER_WHITELIST);
export const DEX_SPENDER_WHITELIST = Object.entries(
  RS_DEX_SPENDER_WHITELIST
).reduce((accu, [dexItem, value]) => {
  accu[dexItem] = ensureChainHashValid(value);
  return accu;
}, {} as typeof RS_DEX_SPENDER_WHITELIST);
