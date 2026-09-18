import {
  parsePortfolioResponse,
  parsePortfolioResponseStrict,
  isPortfolioAllZero,
  getLatestPortfolioValue,
  compute24hChange,
  toChartPoints,
  formatPortfolioTooltipTime,
} from '@/ui/views/Perps/utils/perpsPortfolio';
import type { PortfolioData } from '@/ui/views/Perps/utils/perpsPortfolio';

const series = (av: [number, string][], pnl: [number, string][] = []) => ({
  accountValueHistory: av,
  pnlHistory: pnl,
  vlm: '0',
});

describe('parsePortfolioResponse', () => {
  it('keeps the 4 combined periods and drops perp-prefixed ones', () => {
    const raw = [
      ['day', series([[1, '10']])],
      ['perpDay', series([[1, '5']])],
      ['week', series([[1, '20']])],
      ['month', series([[1, '30']])],
      ['allTime', series([[1, '40']])],
    ];
    const data = parsePortfolioResponse(raw);
    expect(Object.keys(data).sort()).toEqual([
      'allTime',
      'day',
      'month',
      'week',
    ]);
  });

  it('returns empty data for a non-array body', () => {
    expect(parsePortfolioResponse(null)).toEqual({});
  });

  it('skips points that are not [ts, value] pairs', () => {
    const raw = [
      [
        'day',
        {
          accountValueHistory: [[1, '10'], 'bad', [2]],
          pnlHistory: [],
          vlm: '0',
        },
      ],
    ];
    expect(parsePortfolioResponse(raw).day!.accountValueHistory).toEqual([
      [1, '10'],
    ]);
  });
});

describe('parsePortfolioResponseStrict', () => {
  it('throws on a malformed body so callers keep prior data', () => {
    expect(() => parsePortfolioResponseStrict([])).toThrow();
  });
});

describe('isPortfolioAllZero', () => {
  it('treats non-empty all-zero series as empty', () => {
    const data: PortfolioData = {
      day: series([
        [1, '0.0'],
        [2, '0.0'],
      ]),
    };
    expect(isPortfolioAllZero(data)).toBe(true);
  });

  it('is false when any point is non-zero', () => {
    const data: PortfolioData = {
      day: series([
        [1, '0.0'],
        [2, '3'],
      ]),
    };
    expect(isPortfolioAllZero(data)).toBe(false);
  });
});

describe('getLatestPortfolioValue', () => {
  it('takes the last point of the first non-empty period', () => {
    const data: PortfolioData = {
      day: series([
        [1, '10'],
        [2, '12.5'],
      ]),
    };
    expect(getLatestPortfolioValue(data)).toBe(12.5);
  });

  it('falls back to a later period when day is empty', () => {
    const data: PortfolioData = { day: series([]), week: series([[1, '7']]) };
    expect(getLatestPortfolioValue(data)).toBe(7);
  });

  it('returns null with no data at all', () => {
    expect(getLatestPortfolioValue({})).toBeNull();
  });
});

describe('compute24hChange', () => {
  it('uses pnlHistory first/last, not accountValue deltas', () => {
    // A deposit moves accountValue 100 -> 1000 while real pnl is only +10.
    const data: PortfolioData = {
      day: series(
        [
          [1, '100'],
          [2, '1000'],
        ],
        [
          [1, '0'],
          [2, '10'],
        ]
      ),
    };
    const { pnl, percent } = compute24hChange(data);
    expect(pnl).toBe(10);
    // denominator = current PV (1000) - pnl (10) = 990
    expect(percent).toBeCloseTo(10 / 990);
  });

  it('returns percent null when the flow-adjusted denominator is not positive', () => {
    const data: PortfolioData = {
      day: series(
        [
          [1, '5'],
          [2, '5'],
        ],
        [
          [1, '0'],
          [2, '10'],
        ]
      ),
    };
    expect(compute24hChange(data).percent).toBeNull();
  });

  it('reports zero pnl when there are fewer than 2 pnl points', () => {
    const data: PortfolioData = { day: series([[1, '100']], [[1, '3']]) };
    expect(compute24hChange(data).pnl).toBe(0);
  });
});

describe('toChartPoints', () => {
  it('maps tuples to points without resampling', () => {
    expect(
      toChartPoints(
        series([
          [1, '10'],
          [2, '20'],
        ])
      )
    ).toEqual([
      { timestamp: 1, value: 10 },
      { timestamp: 2, value: 20 },
    ]);
  });

  it('returns an empty array for a missing series', () => {
    expect(toChartPoints(undefined)).toEqual([]);
  });
});

describe('formatPortfolioTooltipTime', () => {
  it('omits the year within the current year', () => {
    const now = new Date(2026, 7, 25);
    const ts = new Date(2026, 7, 25, 14, 0).getTime();
    expect(formatPortfolioTooltipTime(ts, now)).toBe('Aug 25, 14:00');
  });

  it('leads with the year for a previous year', () => {
    const now = new Date(2026, 7, 25);
    const ts = new Date(2025, 7, 25, 14, 0).getTime();
    expect(formatPortfolioTooltipTime(ts, now)).toBe('2025 Aug 25, 14:00');
  });
});

describe('toChartPoints non-finite guard', () => {
  it('maps Infinity and NaN to 0 instead of leaking them into the chart', () => {
    expect(
      toChartPoints({
        accountValueHistory: [
          [1, 'Infinity'],
          [2, '-Infinity'],
          [3, 'not-a-number'],
          [4, '12.5'],
        ],
        pnlHistory: [],
        vlm: '0',
      })
    ).toEqual([
      { timestamp: 1, value: 0 },
      { timestamp: 2, value: 0 },
      { timestamp: 3, value: 0 },
      { timestamp: 4, value: 12.5 },
    ]);
  });
});

describe('documented edge cases', () => {
  it('isPortfolioAllZero treats completely empty data as zero', () => {
    expect(isPortfolioAllZero({})).toBe(true);
  });

  it('compute24hChange falls back to another period when day is absent', () => {
    // Documented limit: a missing `day` reads as a real 0%, not as unknown.
    const { pnl, percent } = compute24hChange({
      week: {
        accountValueHistory: [
          [1, '500'],
          [2, '1000'],
        ],
        pnlHistory: [
          [1, '0'],
          [2, '50'],
        ],
        vlm: '0',
      },
    });
    expect(pnl).toBe(0);
    expect(percent).toBe(0);
  });

  it('compute24hChange returns null percent when the denominator is exactly 0', () => {
    const { percent } = compute24hChange({
      day: {
        accountValueHistory: [
          [1, '10'],
          [2, '10'],
        ],
        pnlHistory: [
          [1, '0'],
          [2, '10'],
        ],
        vlm: '0',
      },
    });
    expect(percent).toBeNull();
  });

  it('formatPortfolioTooltipTime does not zero-pad the day of month', () => {
    const now = new Date(2026, 7, 25);
    const ts = new Date(2026, 7, 5, 9, 5).getTime();
    expect(formatPortfolioTooltipTime(ts, now)).toBe('Aug 5, 09:05');
  });
});
