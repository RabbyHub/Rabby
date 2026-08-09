import { resolveTriggerComparator } from '@/ui/views/DesktopPerps/tpslTrigger';

describe('TP/SL trigger comparator', () => {
  // A confirmation dialog renders this as `Mark Price>=…` / `Mark Price<=…`.
  // Inverting it would tell the user the order does the opposite of what it
  // does, so all four combinations are pinned explicitly rather than derived.
  it('fires a long take-profit on the way up', () => {
    expect(resolveTriggerComparator(true, true)).toBe('>=');
  });

  it('fires a long stop-loss on the way down', () => {
    expect(resolveTriggerComparator(true, false)).toBe('<=');
  });

  it('fires a short take-profit on the way down', () => {
    expect(resolveTriggerComparator(false, true)).toBe('<=');
  });

  it('fires a short stop-loss on the way up', () => {
    expect(resolveTriggerComparator(false, false)).toBe('>=');
  });

  it('always gives a side its take-profit and stop-loss in opposite directions', () => {
    for (const isLong of [true, false]) {
      expect(resolveTriggerComparator(isLong, true)).not.toBe(
        resolveTriggerComparator(isLong, false)
      );
    }
  });

  it('mirrors long and short for the same trigger kind', () => {
    for (const isTakeProfit of [true, false]) {
      expect(resolveTriggerComparator(true, isTakeProfit)).not.toBe(
        resolveTriggerComparator(false, isTakeProfit)
      );
    }
  });
});
