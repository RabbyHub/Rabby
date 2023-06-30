import { Summary } from '@rabby-wallet/rabby-api/dist/types';

export type SummaryData = Summary;
type Coin = SummaryData['coin_list'][number];
export type Tokens = SummaryData['token_list'][number];

type AssetsClassify = {
  coin_list: Coin[];
  token_list: Tokens[];
};

export const MINI_ASSET_ID = '__miniAssets__';
export const MINI_DEBT_ID = '__miniDebts__';

export const sumGrossWorth = (data: AssetsClassify) => {
  const list = [...data.coin_list, ...data.token_list]
    .map((x) => {
      const _value = x.amount! * (x.price || 0);

      return {
        ...x,
        id: x.id + ((x as Tokens).chain || ''),
        _value,
        // _netWorth: numFormat(_value, 0, '$'),
      };
    })
    .sort((m, n) => (m._value > n._value ? -1 : 1));

  const [totalAssets, totalDebit] = list.reduce(
    ([assets, debit], n) => {
      return n._value > 0
        ? [assets + n._value, debit]
        : [assets, debit + n._value];
    },
    [0, 0]
  );

  const netWorth = totalAssets + totalDebit;

  const absTotalDebit = Math.abs(totalDebit);

  return {
    totalAssets,
    // _totalAssets: numFormat(totalAssets, 0, '$'),
    totalDebit,
    // _totalDebit: numFormat(absTotalDebit, 0, '$'),
    netWorth,
    // _netWorth: numFormat(netWorth, 0, '$'),
    _debitPercent:
      netWorth === 0
        ? ''
        : `${((absTotalDebit / netWorth) * 100).toFixed(2)} %`,
    list,
  };
};

export type AssetSummaryItem = (Coin | Tokens) & {
  _value: number;
  // _netWorth: string;
  // _percent: number;
};

export type ContentScope = 'profile' | 'bundles';

export type AssetSummaryItemPercent = AssetSummaryItem & {
  _percent: number;
};

export type GrossAssets = {
  totalAssets: number;
  _totalAssets: string;
  totalDebit: number;
  _totalDebit: string;
  netWorth: number;
  _netWorth: string;
  _debitPercent: string;
  list: AssetSummaryItem[];
};

export type AssetChangeItem = {
  id: string;
  symbol: string;
  logo?: string;

  netWorthChangeValue: number;
  // netWorthChange: string;
  // preNetWorth: string;
  // nextNetWorth: string;
  // balanceChange: string;
  balanceDelta: number;
  // preBalance: string;
  // nextBalance: string;
  // priceChange: string;
  // prePrice: string;
  priceDelta: number;
  // nextPrice: string;
  isLoss: boolean;
};

export const groupAssets = (
  list: AssetSummaryItem[] = [],
  baseWorth = 0,
  smallBaseWorth?: number
) => {
  const result: AssetSummaryItemPercent[] = [];
  // 0.1%
  const threshold = (smallBaseWorth || baseWorth) / 1000;

  const miniAssets = {
    symbol: 'Combined other small assets',
    id: MINI_ASSET_ID,
    _value: 0,
  } as AssetSummaryItemPercent;

  const miniDebts = {
    symbol: 'Combined other small debts',
    id: MINI_DEBT_ID,
    _value: 0,
  } as AssetSummaryItemPercent;

  const totalCount = list.length;
  const miniDebtsCount = list.filter((item) => {
    return item._value < 0 && Math.abs(item._value) <= threshold;
  }).length;
  const miniAssetsCount = list.filter((item) => {
    return item._value >= 0 && Math.abs(item._value) <= threshold;
  }).length;

  for (let i = 0; i < list.length; i++) {
    if (totalCount <= 10) {
      result.push({ ...list[i], _percent: 0 });
      continue;
    }
    if (list[i]._value >= 0 && miniAssetsCount <= 3) {
      result.push({ ...list[i], _percent: 0 });
      continue;
    }
    if (list[i]._value < 0 && miniDebtsCount <= 3) {
      result.push({ ...list[i], _percent: 0 });
      continue;
    }
    if (Math.abs(list[i]._value) > threshold) {
      result.push({ ...list[i], _percent: 0 });
      continue;
    }
    if (list[i]._value < 0) {
      miniDebts._value += list[i]._value;
    } else {
      miniAssets._value += list[i]._value;
    }
  }

  result
    .sort((m, n) => (Math.abs(m._value) > Math.abs(n._value) ? -1 : 1))
    .forEach((x) => {
      x._percent = baseWorth === 0 ? 0 : (Math.abs(x._value) / baseWorth) * 100;
    });

  [miniAssets, miniDebts].forEach((x) => {
    if (x._value) {
      // x._netWorth = numFormat(x._value, 0, '$');
      x._percent = baseWorth === 0 ? 0 : (Math.abs(x._value) / baseWorth) * 100;
      result.push(x);
    }
  });

  return result;
};

const computeDelta = (pre?: AssetSummaryItem, next?: AssetSummaryItem) => {
  const delta = (next?._value || 0) - (pre?._value || 0);
  const meta = next || pre;

  const priceDelta =
    pre?.price && typeof next?.price !== 'undefined'
      ? next.price - pre.price
      : 0;

  const priceDeltaPercent =
    priceDelta && pre?.price
      ? Number(((priceDelta / pre.price) * 100).toFixed(2))
      : 0;

  return {
    id: meta!.id,
    symbol: meta!.symbol,
    logo: (meta as Tokens).logo_url,
    isLoss: delta < 0,
    netWorthChangeValue: delta,
    // netWorthChange: numFormat(delta, 0, '$', true),
    // preNetWorth: pre?._netWorth ?? '$0',
    // nextNetWorth: next?._netWorth ?? '$0',
    balanceDelta: (next?.amount || 0) - (pre?.amount || 0),
    // balanceChange: numSeparate(
    //   (next?.amount || 0) - (pre?.amount || 0),
    //   4,
    //   true,
    //   true
    // ),
    // preBalance: pre ? numSeparate(pre.amount, 4, true) : '0',
    // nextBalance: next ? numSeparate(next.amount, 4, true) : '0',
    priceDelta: priceDeltaPercent ? priceDelta : 0,
    // priceChange: priceDeltaPercent
    //   ? `${numSeparate(priceDeltaPercent, 2, true, true)}%`
    //   : '-',
    // prePrice: pre ? numFormat(pre.price, 2, '$') : '-',
    // nextPrice: next ? numFormat(next.price, 2, '$') : '-',
  };
};

export const compareAssets = (
  preAssets?: GrossAssets,
  nextAssets?: GrossAssets
) => {
  if (!preAssets || !nextAssets) {
    return;
  }
  const isNetWorthLoss = nextAssets.netWorth - preAssets.netWorth < 0;
  const preMap = preAssets.list.reduce(
    (m, n) => m.set(n.id, n),
    new Map<string, AssetSummaryItem>()
  );
  const nextMap = new Map<string, AssetSummaryItem>();
  const result: AssetChangeItem[] = [];

  for (let i = 0; i < nextAssets.list.length; i++) {
    const next = nextAssets.list[i];
    const pre = preMap.get(next.id);
    preMap.delete(next.id);
    nextMap.set(next.id, next);
    result.push(computeDelta(pre, next));
  }

  preMap.forEach((pre) => {
    const next = nextMap.get(pre.id);
    result.push(computeDelta(pre, next));
  });

  const sortNumber = isNetWorthLoss ? 1 : -1;

  return result
    .filter((x) => {
      // networth change / price change / balance change
      return (
        Number(x.netWorthChangeValue.toFixed(0)) ||
        x.priceDelta ||
        x.balanceDelta
      );
    })
    .sort((m, n) =>
      m.netWorthChangeValue === n.netWorthChangeValue
        ? 0
        : m.netWorthChangeValue > n.netWorthChangeValue
        ? sortNumber
        : -sortNumber
    );
};
