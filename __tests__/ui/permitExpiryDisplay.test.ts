import { formatTimeSpanToMinutes } from '@/ui/utils/time';

describe('permit signature expiry display', () => {
  test('can show the remaining duration down to minutes', () => {
    expect(formatTimeSpanToMinutes({ d: 0, h: 23, m: 59 })).toBe(
      '23 hours 59 minutes'
    );
    expect(formatTimeSpanToMinutes({ d: 1, h: 2, m: 3 })).toBe('1 day 2 hours');
    expect(formatTimeSpanToMinutes({ d: 0, h: 0, m: 0 })).toBe('1 minute');
  });
});
