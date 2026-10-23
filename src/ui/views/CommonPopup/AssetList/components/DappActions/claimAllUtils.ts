import {
  BalanceChange,
  ExplainTxResponse,
  PortfolioItem,
  TokenItem,
  WithdrawAction,
} from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';

// Below this, the per-position Claim button is enough
export const CLAIM_ALL_MIN_ACTIONS = 2;

export interface ClaimAllCandidate {
  action: WithdrawAction;
  portfolio: PortfolioItem;
}

export const getClaimAllActionKey = (action: WithdrawAction) =>
  `${action.contract_id.toLowerCase()}-${action.func}-${JSON.stringify(
    action.str_params || []
  ).toLowerCase()}`;

/**
 * Pick the claim action of every position, the same one the per-position
 * Claim button would send. Proxy positions and claims requiring an approval
 * are left out, so a claim all batch never contains an approve tx.
 */
export const getClaimAllCandidates = (
  portfolios: {
    _originPortfolio: PortfolioItem;
    withdrawActions?: WithdrawAction[];
  }[]
): ClaimAllCandidate[] => {
  const seen = new Set<string>();
  const result: ClaimAllCandidate[] = [];
  portfolios.forEach((item) => {
    const portfolio = item._originPortfolio;
    if (!portfolio || portfolio.proxy_detail?.proxy_contract_id) {
      return;
    }
    const action = item.withdrawActions?.find((a) => a.type === 'claim');
    if (!action?.contract_id || !action.func) {
      return;
    }
    if (action.need_approve?.to || action.need_approve?.token_id) {
      return;
    }
    // the same claim listed twice would revert the second time
    const key = getClaimAllActionKey(action);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push({ action, portfolio });
  });
  return result;
};

/**
 * Content key of a candidate list: portfolio refreshes create new objects
 * even when nothing changed, this only changes when the claims or the
 * claimable amounts do.
 */
export const getClaimAllCandidatesKey = (candidates: ClaimAllCandidate[]) =>
  candidates
    .map(
      ({ action, portfolio }) =>
        `${getClaimAllActionKey(action)}:${(
          portfolio.detail?.reward_token_list || []
        )
          .map((token) => `${token.id}=${token.amount}`)
          .join(',')}`
    )
    .join('|');

export const getClaimAllRewardUsdValue = (portfolios: PortfolioItem[]) => {
  return portfolios
    .reduce((acc, portfolio) => {
      const rewards = portfolio.detail?.reward_token_list || [];
      return rewards.reduce(
        (sum, token) =>
          sum.plus(new BigNumber(token.amount || 0).times(token.price || 0)),
        acc
      );
    }, new BigNumber(0))
    .toNumber();
};

const mergeTokenList = (lists: TokenItem[][]) => {
  const map = new Map<string, TokenItem>();
  lists.flat().forEach((token) => {
    const key = `${token.chain}:${token.id}`.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...token });
      return;
    }
    map.set(key, {
      ...prev,
      amount: new BigNumber(prev.amount || 0)
        .plus(token.amount || 0)
        .toNumber(),
      usd_value:
        prev.usd_value === undefined && token.usd_value === undefined
          ? undefined
          : new BigNumber(prev.usd_value || 0)
              .plus(token.usd_value || 0)
              .toNumber(),
      raw_amount:
        prev.raw_amount !== undefined && token.raw_amount !== undefined
          ? new BigNumber(prev.raw_amount).plus(token.raw_amount).toFixed()
          : undefined,
      raw_amount_hex_str: undefined,
    });
  });
  return Array.from(map.values());
};

/**
 * MiniSign only displays the balance change of the last tx of a batch.
 * For a claim all batch every tx matters, so they are summed up here.
 */
export const mergeBalanceChanges = (list: BalanceChange[]): BalanceChange => {
  const firstError = list.find((item) => item.error)?.error;
  return {
    success: list.length > 0 && list.every((item) => item.success),
    error: firstError || null,
    usd_value_change: list.reduce(
      (acc, item) => acc + (item.usd_value_change || 0),
      0
    ),
    receive_token_list: mergeTokenList(
      list.map((item) => item.receive_token_list || [])
    ),
    send_token_list: mergeTokenList(
      list.map((item) => item.send_token_list || [])
    ),
    receive_nft_list: list.flatMap((item) => item.receive_nft_list || []),
    send_nft_list: list.flatMap((item) => item.send_nft_list || []),
  };
};

/**
 * Fail closed: every tx of the batch must simulate successfully, receive
 * something and send nothing out, otherwise signing stays disabled.
 */
export const isClaimAllPreExecValid = (
  results: ExplainTxResponse[] | undefined,
  expectedCount: number
) => {
  if (!results?.length || results.length !== expectedCount) {
    return false;
  }
  return results.every(
    (r) =>
      !!r?.pre_exec?.success &&
      (!!r.balance_change?.receive_token_list?.length ||
        !!r.balance_change?.receive_nft_list?.length) &&
      !r.balance_change?.send_token_list?.length &&
      !r.balance_change?.send_nft_list?.length
  );
};
