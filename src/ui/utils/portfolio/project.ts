import { immerable } from 'immer';
import {
  formatUsdValue,
  formatPrice,
  formatAmount,
  calcPercent,
} from '../number';
import { getTokenSymbol } from '../token';
import {
  AbstractProject,
  AbstractPortfolio,
  PortfolioProject,
  AbstractPortfolioToken,
} from './types';

import {
  PortfolioItem,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';

export class DisplayedProject implements AbstractProject {
  [immerable] = true;
  id: string;
  name: string;
  logo?: string;
  chain?: string;
  netWorth: number;
  _netWorth: string;
  _portfolioDict: Record<string, DisplayedPortfolio> = {};
  _portfolios: DisplayedPortfolio[] = [];
  _historyPatched?: boolean;
  _serverUpdatedAt = Math.ceil(new Date().getTime() / 1000);
  site_url?: string;
  netWorthChange = 0;
  _netWorthChange = '-';
  _netWorthChangePercent = '';
  _intNetworth = '';
  _rawPortfolios?: PortfolioItem[] = [];

  constructor(
    p: Partial<PortfolioProject>,
    portfolios?: PortfolioItem[],
    countRepeat = false
  ) {
    this.id = p.id!;
    this.name = p.name!;
    this.logo = p.logo_url;
    this.chain = p.chain;
    this.netWorth = 0;
    this._netWorth = '-';
    this.site_url = p.site_url;
    this._rawPortfolios = portfolios;

    this.setPortfolios(portfolios, countRepeat);
  }

  setPortfolios(portfolios?: PortfolioItem[], countRepeat = false) {
    portfolios?.forEach((x, i) => {
      const position = new DisplayedPortfolio(x);
      const _p = this._portfolioDict[position.id];
      if (_p) {
        if (countRepeat) {
          // bundle 的 临时 fix，bundle 中相同的 portfolio 没有聚合
          position.id = `${position.id}_${i}`;
        } else {
          // 如果之前已经有了这个 position，就 减去 原来的 netWorth
          this.netWorth -= _p.netWorth;
        }
      }
      this.netWorth += position.netWorth;
      this._netWorth = formatUsdValue(this.netWorth);
      this._intNetworth = formatUsdValue(this.netWorth);

      this._portfolioDict[position.id] = position;

      this._serverUpdatedAt = Math.min(this._serverUpdatedAt, x.update_at);
    });

    this._portfolios = Object.values(this._portfolioDict).sort((m, n) => {
      // debt 在最后面进行从大到小排序
      if (n._sumTokenRealUsdValue < 0 && m._sumTokenRealUsdValue < 0) {
        return m._sumTokenRealUsdValue - n._sumTokenRealUsdValue;
      }

      return n._sumTokenRealUsdValue - m._sumTokenRealUsdValue;
    });
  }

  patchHistory(portfolios?: PortfolioItem[], patchRestFromZero?: boolean) {
    portfolios?.forEach((x) => {
      const id = `${x.pool.id}${x.position_index || ''}`;
      const _p = this._portfolioDict[id];

      // 先把拿到的历史 portfolio patch 一遍
      if (_p) {
        _p.patchHistory(x);
        if (_p.netWorthChange) {
          this.netWorthChange += _p.netWorthChange;
        }
      }
    });

    // wallet 这种就不用 patchRestFromZero，因为 wallet 就是缝合的，portfolio(即 chains) 之间并没有关系
    if (patchRestFromZero) {
      // 再根据现在的 portfolio list，如果没有被 history patch 过，说明原来没有，就用 0 去 patch
      this._portfolios?.forEach((p) => {
        const _p = this._portfolioDict[p.id];
        if (_p && !_p._historyPatched) {
          _p.patchHistory({ asset_token_list: [] } as any);
          if (_p.netWorthChange) {
            this.netWorthChange += _p.netWorthChange;
          }
        }
      });
    }

    this.afterHistoryPatched();
  }

  afterHistoryPatched() {
    this._netWorthChange = formatUsdValue(Math.abs(this.netWorthChange));
    const preUsdValue = this.netWorth - this.netWorthChange;
    this._netWorthChangePercent = preUsdValue
      ? calcPercent(preUsdValue, this.netWorth, 2, true)
      : this.netWorth
      ? '+100.00%'
      : '+0.00%';

    this._portfolios = this._portfolios?.map(
      (m) => this._portfolioDict[m.id] || m
    );
    this._historyPatched = true;
  }

  patchPrice(tokenDict: Record<string, number>) {
    if (this._historyPatched) {
      return;
    }

    this._portfolios.forEach((p) => {
      const _p = this._portfolioDict[p.id];

      if (!_p._historyPatched) {
        _p.patchPrice(tokenDict);

        if (_p.netWorthChange) {
          this.netWorthChange += _p.netWorthChange;
        }
      }
    });

    this.afterHistoryPatched();
  }
}

class DisplayedPortfolio implements AbstractPortfolio {
  [immerable] = true;
  id: string;
  name?: string;
  type?: string;
  netWorth: number;
  _netWorth: string;
  _sumTokenRealUsdValue = 0;
  // _project?: DisplayedProject;
  _tokenDict: Record<string, DisplayedToken> = {};
  _tokenList: DisplayedToken[] = [];
  _historyPatched = false;
  _originPortfolio: PortfolioItem;
  netWorthChange = 0;
  _netWorthChange = '-';
  _changePercentStr = '';

  constructor(p: PortfolioItem) {
    this.id = `${p.pool.id}${p.position_index || ''}`;
    this._originPortfolio = p;
    this.name = p.name;
    // this._project = project;

    // 如果是 wallet，没有 stats 对象
    let tokenNetWorth = 0;

    p.asset_token_list?.forEach((t) => {
      const dt = new DisplayedToken(t);
      this._tokenDict[dt.id] = dt;

      tokenNetWorth += dt._usdValue || 0;
      this._sumTokenRealUsdValue += dt._realUsdValue || 0;
    });

    this.netWorth = p.stats ? p.stats.net_usd_value : tokenNetWorth;
    this._netWorth = formatUsdValue(this.netWorth);

    this._tokenList = Object.values(this._tokenDict).sort((m, n) => {
      // debt 在最后面进行从大到小排序
      if (n._realUsdValue < 0 && m._realUsdValue < 0) {
        return m._realUsdValue - n._realUsdValue;
      }

      return n._realUsdValue - m._realUsdValue;
    });
  }

  patchHistory(h: PortfolioItem) {
    h.asset_token_list?.forEach((x) => {
      const id = x.id + x.chain;
      const _t = this._tokenDict[id];

      if (_t) {
        _t.patchHistory(x);
        if (_t._realUsdValueChange) {
          this.netWorthChange += _t._realUsdValueChange!;
        }
      }
    });

    // 没有被 patch 到的 token，即从无到有的 token，手动 patch
    this._tokenList.forEach((t) => {
      const _t = this._tokenDict[t.id];
      if (_t && !_t._historyPatched) {
        // priceChange 不需要，这里就直接当 0，只需要 amountChange 和 netWorthChange
        _t.patchHistory({ amount: 0, price: 0 } as any);
        if (_t._realUsdValueChange) {
          this.netWorthChange += _t._realUsdValueChange!;
        }
      }
    });

    let preNetworth = this.netWorth - this.netWorthChange;

    // 如果有完整的 portfolio 进来，从它的 stats 上取
    // 因为我们从 token 累加来的 change 值，有可能有问题
    // 比如，出现了一个 lending pool，它的 debt 比 asset 大（当然这数据应该是错误的，后端在 stats 中修正为 0）

    // 如果我们自己算的话，设 debt 为 -2， asset 为 1，当前 networth 为 0（后端修正），change 为 -1（通过 token 累加得到）
    // 这时候推理出 pre 为1， 然而实际上可能是原本 networth 是修正后的 0，如(debt -1/-2..., asset 为 1)
    // 应当以修正后的 0 计，即从 0 到 0

    // 如果 没有 debt 这种，就不用考虑它
    if (typeof h?.stats?.net_usd_value !== 'undefined') {
      preNetworth = h.stats.net_usd_value;
      this.netWorthChange = this.netWorth - preNetworth;
    }

    // 历史没有它的 assets，应该当做 0
    if (!h?.asset_token_list?.length) {
      preNetworth = 0;
      this.netWorthChange = this.netWorth - preNetworth;
    }

    this.afterHistoryPatched(preNetworth);
  }

  // 特殊情况，对于不支持历史结点的 portfolio
  patchPrice(tokenDict: Record<string, number>) {
    if (this._historyPatched) {
      return;
    }

    this._tokenList.forEach((t) => {
      const _t = this._tokenDict[t.id];

      if (_t && !_t._historyPatched) {
        _t.patchPrice(tokenDict[_t._tokenId]);
        if (_t._realUsdValueChange) {
          this.netWorthChange += _t._realUsdValueChange!;
        }
      }
    });

    let preNetworth = this.netWorth - this.netWorthChange;

    // 比如说现在是 0，持仓数量没变，debt 的价格减少，总金额增多，会算出之前的余额为 负数
    // 但实际上一个 portfolio 不应该是负数，最小为 0
    // 如果 没有 debt 这种，就不用考虑它
    if (preNetworth < 0) {
      preNetworth = 0;
      this.netWorthChange = this.netWorth - preNetworth;
    }

    this.afterHistoryPatched(preNetworth);
  }

  afterHistoryPatched(preNetworth: number) {
    this._netWorthChange = formatUsdValue(Math.abs(this.netWorthChange));

    this._changePercentStr = preNetworth
      ? calcPercent(preNetworth, this.netWorth, 2, true)
      : this.netWorth
      ? '+100.00%'
      : '+0.00%';

    this._tokenList = this._tokenList.map((t) => this._tokenDict[t.id] || t);
    this._historyPatched = true;
  }

  // 24h 之前有，现在没有的不考虑展示，只展示当前仓位
  // static createFromHistory(h: PortfolioItem) {}
}

export function encodeProjectTokenId(token: PortfolioItemToken) {
  return token.id + token.chain;
}

export class DisplayedToken implements AbstractPortfolioToken {
  [immerable] = true;
  id: string;
  _tokenId: string;
  chain: string;
  logo_url: string;
  amount: number;
  symbol: string;
  price: number;
  decimals: number;
  display_symbol: string | null;
  is_core: boolean;
  is_wallet: boolean;
  name: string;
  optimized_symbol: string;
  is_verified: boolean;
  time_at: number;
  price_24h_change?: number | null;
  _amountStr?: string;
  _priceStr?: string;
  _amountChange?: number;
  _amountChangeStr = '';
  _usdValue?: number;
  _realUsdValue: number;
  _usdValueStr?: string;
  _historyPatched?: boolean;
  _usdValueChange?: number;
  _realUsdValueChange?: number;
  _usdValueChangeStr?: string;
  _usdValueChangePercent?: string;
  _amountChangeUsdValueStr = '';

  constructor(token: PortfolioItemToken) {
    this._tokenId = token.id;
    this.amount = token.amount || 0;
    this.id = encodeProjectTokenId(token);
    this.chain = token.chain;
    this.logo_url = token.logo_url;
    this.price = token.price || 0;
    this._realUsdValue = this.price * this.amount;
    // 注意这里，debt 也被处理成正值
    this._usdValue = Math.abs(this._realUsdValue);
    this.symbol = getTokenSymbol(token);

    this._usdValueStr = formatUsdValue(this._usdValue);
    this._priceStr = formatPrice(this.price);
    this._amountStr = formatAmount(Math.abs(this.amount));
    this.decimals = token.decimals;
    this.is_core = token.is_core;
    this.display_symbol = token.display_symbol;
    this.is_verified = token.is_verified;
    this.optimized_symbol = token.optimized_symbol;
    this.is_wallet = token.is_wallet;
    this.name = token.name;
    this.time_at = token.time_at;
    this.price_24h_change = token.price_24h_change;

    // 默认是它
    this._usdValueChangeStr = '-';
  }

  patchHistory(h: PortfolioItemToken) {
    this._historyPatched = true;
    // debt 都当做正值
    this._amountChange = Math.abs(this.amount) - Math.abs(h.amount || 0);
    const amountChangeUsdValue = Math.abs(this._amountChange! * this.price);

    // 大于 $0.01 才展示
    if (amountChangeUsdValue >= 0.01) {
      this._amountChangeStr = `${formatAmount(this._amountChange)} ${
        this.symbol
      }`;
      this._amountChangeUsdValueStr = formatUsdValue(amountChangeUsdValue);
    }

    const preValue = (h.amount || 0) * (h.price || 0);
    const preUsdValue = Math.abs(preValue);
    this._usdValueChange = this._usdValue! - preUsdValue;
    this._usdValueChangeStr = formatUsdValue(Math.abs(this._usdValueChange));

    this._usdValueChangePercent = preUsdValue
      ? calcPercent(preUsdValue, this._usdValue, 2, true)
      : this._usdValue
      ? '+100.00%'
      : '+0.00%';

    this._realUsdValueChange = this._realUsdValue! - preValue;
  }

  patchPrice(price?: number) {
    if (this._historyPatched || (!price && price !== 0)) {
      return;
    }

    // 特殊情况，对于不支持历史结点的 portfolio，只当 amount 没有变化
    this.patchHistory({
      amount: this.amount,
      price,
    } as PortfolioItemToken);
  }

  // 24h 之前有，现在没有的不考虑展示，只展示当前仓位
  // static createFromHistory(h: PortfolioItemToken) {}
}
