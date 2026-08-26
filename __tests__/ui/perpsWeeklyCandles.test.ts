import {
  aggregateDailyToWeeklyBars,
  CandleBar,
  cloneWeeklyHistoryState,
  getLatestWeeklyHistoryState,
  getMondayUtc,
  seedWeeklyCandleStateFromHistory,
  shouldReplaceWeeklyHistoryState,
  updateWeeklyCandle,
  WeeklyCandleState,
} from '@/ui/views/Perps/weeklyCandles';

const utc = (value: string) => new Date(`${value}T00:00:00.000Z`).getTime();

const bar = (
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): CandleBar => ({
  time: utc(date),
  open,
  high,
  low,
  close,
  volume,
});

describe('weekly candle aggregation', () => {
  it('groups 24x7 daily bars on Monday UTC boundaries', () => {
    const daily = [
      bar('2026-08-23', 90, 100, 80, 95, 3), // Sunday, prior week
      bar('2026-08-24', 100, 110, 95, 105, 4),
      bar('2026-08-25', 105, 120, 101, 115, 6),
    ];

    expect(aggregateDailyToWeeklyBars(daily)).toEqual([
      bar('2026-08-17', 90, 100, 80, 95, 3),
      bar('2026-08-24', 100, 120, 95, 115, 10),
    ]);
    expect(getMondayUtc(utc('2026-08-23'))).toBe(utc('2026-08-17'));
  });

  it('replaces the current daily volume contribution on realtime updates', () => {
    const state: WeeklyCandleState = {
      currentWeekBar: bar('2026-08-24', 100, 120, 90, 110, 15),
      lastDailyVolume: {
        time: utc('2026-08-26'),
        value: 5,
      },
    };

    const result = updateWeeklyCandle(
      state,
      bar('2026-08-26', 108, 125, 104, 122, 8)
    );

    expect(result).toEqual(bar('2026-08-24', 100, 125, 90, 122, 18));
  });

  it('seeds a live partial week when history is unavailable', () => {
    const state: WeeklyCandleState = {
      currentWeekBar: null,
      lastDailyVolume: null,
    };

    const result = updateWeeklyCandle(
      state,
      bar('2026-08-26', 108, 125, 104, 122, 8)
    );

    expect(result).toEqual(bar('2026-08-24', 108, 125, 104, 122, 8));
    expect(state.lastDailyVolume).toEqual({
      time: utc('2026-08-26'),
      value: 8,
    });
  });

  it('rolls over to a new week instead of mutating the previous one', () => {
    const state: WeeklyCandleState = {
      currentWeekBar: bar('2026-08-17', 100, 130, 90, 120, 50),
      lastDailyVolume: {
        time: utc('2026-08-23'),
        value: 9,
      },
    };

    const result = updateWeeklyCandle(
      state,
      bar('2026-08-24', 121, 124, 118, 123, 2)
    );

    expect(result).toEqual(bar('2026-08-24', 121, 124, 118, 123, 2));
  });

  it('seeds realtime volume from the latest daily bar in history', () => {
    const daily = [
      bar('2026-08-24', 100, 110, 95, 105, 4),
      bar('2026-08-25', 105, 120, 101, 115, 6),
    ];
    const weekly = aggregateDailyToWeeklyBars(daily);

    expect(getLatestWeeklyHistoryState(weekly, daily)).toEqual({
      currentWeekBar: bar('2026-08-24', 100, 120, 95, 115, 10),
      lastDailyVolume: {
        time: utc('2026-08-25'),
        value: 6,
      },
    });
  });

  it('does not replace a complete same-week seed with a narrower page', () => {
    const complete = {
      currentWeekBar: bar('2026-08-24', 100, 125, 95, 120, 20),
      lastDailyVolume: { time: utc('2026-08-26'), value: 8 },
    };
    const narrow = {
      currentWeekBar: bar('2026-08-24', 110, 123, 108, 119, 7),
      lastDailyVolume: { time: utc('2026-08-26'), value: 7 },
    };
    const refreshed = {
      currentWeekBar: bar('2026-08-24', 100, 128, 95, 124, 24),
      lastDailyVolume: { time: utc('2026-08-27'), value: 4 },
    };

    expect(shouldReplaceWeeklyHistoryState(complete, narrow)).toBe(false);
    expect(shouldReplaceWeeklyHistoryState(complete, refreshed)).toBe(true);
  });

  it('hydrates a partial realtime state from same-week history by value', () => {
    const state: WeeklyCandleState = {
      currentWeekBar: bar('2026-08-24', 110, 123, 108, 119, 7),
      lastDailyVolume: { time: utc('2026-08-26'), value: 7 },
    };
    const history = {
      currentWeekBar: bar('2026-08-24', 100, 125, 95, 120, 20),
      lastDailyVolume: { time: utc('2026-08-26'), value: 8 },
    };

    expect(
      seedWeeklyCandleStateFromHistory(state, history, utc('2026-08-26'))
    ).toBe(true);
    expect(state).toEqual(history);
    expect(state.currentWeekBar).not.toBe(history.currentWeekBar);
    expect(state.lastDailyVolume).not.toBe(history.lastDailyVolume);

    expect(
      seedWeeklyCandleStateFromHistory(state, history, utc('2026-09-02'))
    ).toBe(false);
  });

  it('clones weekly history without sharing mutable nested values', () => {
    const history = {
      currentWeekBar: bar('2026-08-24', 100, 125, 95, 120, 20),
      lastDailyVolume: { time: utc('2026-08-26'), value: 8 },
    };
    const clone = cloneWeeklyHistoryState(history)!;

    clone.currentWeekBar.close = 130;
    clone.lastDailyVolume!.value = 9;

    expect(history.currentWeekBar.close).toBe(120);
    expect(history.lastDailyVolume.value).toBe(8);
  });
});
