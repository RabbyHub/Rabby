import { useMemo } from 'react';

import { useSwitch } from '../switch';

// Logic of expand portfolios
// 1. length of list more than 15
// 2. threshold of expand is 1% of portfolios
// 3. portfolio will not expand if usd value is more than 1000
// 4. only expand if expand count more than 3
export const getExpandListSwitch = <
  T extends { netWorth?: number; _usdValue?: number }
>(
  list?: T[],
  totalValue?: number
) => {
  const listLength = list?.length || 0;

  const threshold = Math.min((totalValue || 0) / 1000, 1000);
  const thresholdIndex = list
    ? list.findIndex((m) => (m._usdValue || m.netWorth || 0) < threshold)
    : -1;

  const hasExpandSwitch =
    listLength >= 15 && thresholdIndex > -1 && thresholdIndex <= listLength - 4;

  return { thresholdIndex, hasExpandSwitch };
};

export const useExpandList = <
  T extends { netWorth?: number; _usdValue?: number }
>(
  list?: T[],
  totalValue?: number,
  defaultExpand?: boolean
) => {
  const { on, toggle, turn } = useSwitch(defaultExpand);

  const { thresholdIndex, hasExpandSwitch } = useMemo(
    () => getExpandListSwitch(list, totalValue),
    [list, totalValue]
  );

  const result = useMemo(() => {
    return on || !hasExpandSwitch ? list : list?.slice(0, thresholdIndex);
  }, [on, list, thresholdIndex, hasExpandSwitch]);

  return {
    hasExpandSwitch,
    isExpanded: on,
    result,
    thresholdIndex,
    toggleExpand: toggle,
    turnExpand: turn,
  };
};
