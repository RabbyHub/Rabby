import { useSwitch } from '@/ui/utils/switch';
import { useMemo } from 'react';

// https://debankglobal.larksuite.com/docx/L48zdOFZQofLZ9xddN4uQIFMsnj
// 折叠资产列表逻辑
// 1. list 长度要大于 15
// 2. 折叠阈值为 list 总和的 {GROUP_MINI_THRESHOLD}
// 3. 资产 > 1000 的不折叠
// 4. 满足以上条件的小于 3 个，不折叠
// 5. 特殊情况，200 个 1，全部折叠

// 0.1%
const MIN_ASSETS_THREADHOLD = 0.001;

export const getExpandListSwitch = <
  T extends { netWorth?: number; _usdValue?: number }
>(
  list?: T[],
  totalValue?: number
) => {
  const listLength = list?.length || 0;

  // 条件 2，条件 3
  const threadhold = Math.min((totalValue || 0) * MIN_ASSETS_THREADHOLD, 1000);
  const thresholdIndex = list
    ? list.findIndex((m) => (m._usdValue || m.netWorth || 0) < threadhold)
    : -1;

  // 条件 1，条件 4, 条件 5
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

  const smallLength = useMemo(() => {
    return (list?.length || 0) - (thresholdIndex || 0);
  }, [list?.length, thresholdIndex]);

  return {
    hasExpandSwitch,
    isExpanded: on,
    result,
    smallLength,
    thresholdIndex,
    toggleExpand: toggle,
    turnExpand: turn,
  };
};
