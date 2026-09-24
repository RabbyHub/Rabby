import {
  BRIDGE_DURATION_FAST_COLOR,
  formatBridgeDuration,
  formatEstimateClock,
  getBridgeDurationColor,
} from '@/ui/views/Bridge/utils/duration';

const t = (key: string, options: Record<string, number | undefined> = {}) =>
  `${key}:${JSON.stringify(options)}`;

describe('formatBridgeDuration', () => {
  it('shows seconds when under one minute', () => {
    expect(formatBridgeDuration(12, t)).toBe(
      'page.bridge.duration-sec:{"duration":12}'
    );
    expect(formatBridgeDuration(0.4, t)).toBe(
      'page.bridge.duration-sec:{"duration":1}'
    );
    expect(formatBridgeDuration(59, t)).toBe(
      'page.bridge.duration-sec:{"duration":59}'
    );
  });

  it('shows rounded minutes when at least one minute and under one hour', () => {
    expect(formatBridgeDuration(60, t)).toBe(
      'page.bridge.duration:{"duration":1}'
    );
    expect(formatBridgeDuration(150, t)).toBe(
      'page.bridge.duration:{"duration":3}'
    );
  });

  it('shows hours once the quote reaches one hour', () => {
    expect(formatBridgeDuration(60 * 60, t)).toBe(
      'page.bridge.duration-hour:{"duration":1}'
    );
    expect(formatBridgeDuration(90 * 60, t)).toBe(
      'page.bridge.duration-hour-min:{"hours":1,"minutes":30}'
    );
  });

  it('shows days once the quote reaches one day', () => {
    expect(formatBridgeDuration(24 * 60 * 60, t)).toBe(
      'page.bridge.duration-day:{"duration":1}'
    );
    expect(formatBridgeDuration(26 * 60 * 60, t)).toBe(
      'page.bridge.duration-day-hour:{"days":1,"hours":2}'
    );
    expect(formatBridgeDuration(24 * 60 * 60 + 30 * 60, t)).toBe(
      'page.bridge.duration-day-min:{"days":1,"minutes":30}'
    );
  });
});

describe('formatEstimateClock', () => {
  it('keeps minutes and seconds under one hour', () => {
    expect(formatEstimateClock(6)).toBe('0:06');
    expect(formatEstimateClock(6, true)).toBe('00:06');
    expect(formatEstimateClock(90)).toBe('1:30');
  });

  it('shows hours at and above one hour', () => {
    expect(formatEstimateClock(60 * 60)).toBe('1:00:00');
    expect(formatEstimateClock(90 * 60)).toBe('1:30:00');
    expect(formatEstimateClock(2 * 60 * 60 + 5)).toBe('2:00:05');
  });

  it('shows days at and above one day', () => {
    expect(formatEstimateClock(24 * 60 * 60)).toBe('1d 0:00:00');
    expect(formatEstimateClock(26 * 60 * 60 + 65)).toBe('1d 2:01:05');
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
