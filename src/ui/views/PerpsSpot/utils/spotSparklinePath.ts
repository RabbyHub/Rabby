const PADDING_Y = 6;

/** SVG paths (line + filled area) for a list of closes in a width×height box. */
export const buildSparklinePath = (
  closes: ReadonlyArray<number>,
  width: number,
  height: number
): { line: string; area: string } => {
  if (closes.length < 2 || width <= 0) {
    return { line: '', area: '' };
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const stepX = width / (closes.length - 1);
  const points = closes.map((close, index) => {
    const x = index * stepX;
    const y = PADDING_Y + (1 - (close - min) / span) * (height - PADDING_Y * 2);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M${points.join(' L')}`;
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return { line, area };
};
