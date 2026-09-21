import {
  BRIDGE_DURATION_FAST_COLOR,
  formatBridgeDuration,
  getBridgeDurationColor,
} from '@/ui/views/Bridge/utils/duration';

const t = (key: string, options: { duration: number }) =>
  `${key}:${options.duration}`;

describe('formatBridgeDuration', () => {
  it('shows seconds when under one minute', () => {
    expect(formatBridgeDuration(12, t)).toBe('page.bridge.duration-sec:12');
    expect(formatBridgeDuration(0.4, t)).toBe('page.bridge.duration-sec:1');
    expect(formatBridgeDuration(59, t)).toBe('page.bridge.duration-sec:59');
  });

  it('shows rounded minutes when at least one minute', () => {
    expect(formatBridgeDuration(60, t)).toBe('page.bridge.duration:1');
    expect(formatBridgeDuration(150, t)).toBe('page.bridge.duration:3');
  });
});

describe('getBridgeDurationColor', () => {
  it('uses the fast color for short quotes', () => {
    expect(getBridgeDurationColor(30)).toBe(BRIDGE_DURATION_FAST_COLOR.quote);
    expect(getBridgeDurationColor(180, BRIDGE_DURATION_FAST_COLOR.detail)).toBe(
      BRIDGE_DURATION_FAST_COLOR.detail
    );
  });

  it('turns orange then red as duration grows', () => {
    expect(getBridgeDurationColor(180)).toBe(BRIDGE_DURATION_FAST_COLOR.quote);
    expect(getBridgeDurationColor(240)).toBe('text-r-orange-default');
    expect(getBridgeDurationColor(600)).toBe('text-r-orange-default');
    expect(getBridgeDurationColor(661)).toBe('text-r-red-default');
  });
});
