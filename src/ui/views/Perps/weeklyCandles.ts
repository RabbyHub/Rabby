export type CandleBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type WeeklyCandleState = {
  currentWeekBar: CandleBar | null;
  lastDailyVolume: { time: number; value: number } | null;
};

export type WeeklyHistoryState = {
  currentWeekBar: CandleBar;
  lastDailyVolume: { time: number; value: number } | null;
};

export const getMondayUtc = (utcMs: number): number => {
  const date = new Date(utcMs);
  const day = date.getUTCDay();
  const diffDays = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffDays);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
};

export const aggregateDailyToWeeklyBars = (
  dailyBars: CandleBar[]
): CandleBar[] => {
  if (!dailyBars.length) return [];

  const weeks = new Map<number, CandleBar>();

  for (const bar of dailyBars) {
    const mondayTs = getMondayUtc(bar.time);
    const existing = weeks.get(mondayTs);
    if (existing) {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      existing.volume += bar.volume;
    } else {
      weeks.set(mondayTs, {
        time: mondayTs,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      });
    }
  }

  return Array.from(weeks.values()).sort((a, b) => a.time - b.time);
};

export const getLatestWeeklyHistoryState = (
  weeklyBars: CandleBar[],
  dailyBars: CandleBar[]
): WeeklyHistoryState | null => {
  const currentWeekBar = weeklyBars[weeklyBars.length - 1];
  if (!currentWeekBar) return null;

  const lastDailyBar = dailyBars
    .slice()
    .reverse()
    .find((bar) => getMondayUtc(bar.time) === currentWeekBar.time);

  return {
    currentWeekBar: { ...currentWeekBar },
    lastDailyVolume: lastDailyBar
      ? {
          time: lastDailyBar.time,
          value: lastDailyBar.volume,
        }
      : null,
  };
};

export const cloneWeeklyHistoryState = (
  historyState: WeeklyHistoryState | null | undefined
): WeeklyHistoryState | null => {
  if (!historyState) return null;

  return {
    currentWeekBar: { ...historyState.currentWeekBar },
    lastDailyVolume: historyState.lastDailyVolume
      ? { ...historyState.lastDailyVolume }
      : null,
  };
};

/**
 * Prefer a later week, or a same-week snapshot that covers at least as much
 * cumulative time and volume. This prevents a narrower same-week getBars page
 * from replacing the complete seed used by realtime aggregation.
 */
export const shouldReplaceWeeklyHistoryState = (
  current: WeeklyHistoryState | null | undefined,
  next: WeeklyHistoryState
): boolean => {
  if (!current) return true;

  const currentWeek = current.currentWeekBar;
  const nextWeek = next.currentWeekBar;
  if (nextWeek.time !== currentWeek.time) {
    return nextWeek.time > currentWeek.time;
  }

  const currentLastDay = current.lastDailyVolume?.time ?? -Infinity;
  const nextLastDay = next.lastDailyVolume?.time ?? -Infinity;
  return nextLastDay >= currentLastDay && nextWeek.volume >= currentWeek.volume;
};

/** Seed a mutable realtime state only when history belongs to the same week. */
export const seedWeeklyCandleStateFromHistory = (
  state: WeeklyCandleState,
  historyState: WeeklyHistoryState | null | undefined,
  dailyTime: number
): boolean => {
  if (
    !historyState ||
    historyState.currentWeekBar.time !== getMondayUtc(dailyTime)
  ) {
    return false;
  }

  const seed = cloneWeeklyHistoryState(historyState)!;
  state.currentWeekBar = seed.currentWeekBar;
  state.lastDailyVolume = seed.lastDailyVolume;
  return true;
};

/**
 * Merge a cumulative daily candle into a cumulative weekly candle.
 *
 * Hyperliquid repeatedly sends the current day's full volume, so replace that
 * day's previous contribution instead of adding it again. With no history seed
 * the daily candle becomes a partial current-week bar; that keeps the latest
 * price live until the next history refresh fills in earlier days.
 */
export const updateWeeklyCandle = (
  state: WeeklyCandleState,
  dayBar: CandleBar
): CandleBar => {
  const mondayTs = getMondayUtc(dayBar.time);
  const currentWeekBar = state.currentWeekBar;

  if (!currentWeekBar || currentWeekBar.time !== mondayTs) {
    state.currentWeekBar = {
      ...dayBar,
      time: mondayTs,
    };
  } else {
    currentWeekBar.high = Math.max(currentWeekBar.high, dayBar.high);
    currentWeekBar.low = Math.min(currentWeekBar.low, dayBar.low);
    currentWeekBar.close = dayBar.close;

    const prevDayVolume =
      state.lastDailyVolume?.time === dayBar.time
        ? state.lastDailyVolume.value
        : 0;
    currentWeekBar.volume =
      currentWeekBar.volume - prevDayVolume + dayBar.volume;
  }

  state.lastDailyVolume = {
    time: dayBar.time,
    value: dayBar.volume,
  };

  return state.currentWeekBar!;
};
