import { buildSparklinePath } from '@/ui/views/PerpsSpot/utils/spotSparklinePath';

describe('buildSparklinePath', () => {
  it('needs at least two points', () => {
    expect(buildSparklinePath([1], 100, 50)).toEqual({ line: '', area: '' });
    expect(buildSparklinePath([1, 2], 0, 50)).toEqual({ line: '', area: '' });
  });

  it('maps closes across the width with the max at the top', () => {
    const { line, area } = buildSparklinePath([1, 3, 2], 100, 50);
    expect(line).toBe('M0.0 44.0 L50.0 6.0 L100.0 25.0');
    expect(area).toBe(`${line} L100 50 L0 50 Z`);
  });

  it('draws a flat line for constant prices', () => {
    expect(buildSparklinePath([2, 2, 2], 100, 50).line).toBe(
      'M0.0 44.0 L50.0 44.0 L100.0 44.0'
    );
  });
});
