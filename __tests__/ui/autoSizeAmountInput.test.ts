import { getAutoSizeAmountFontSize } from '@/ui/hooks/useAutoSizeAmountInput';

const DEFAULT_PARAMS = {
  containerWidth: 100,
  textWidthAtMaxFontSize: 100,
  maxFontSize: 28,
  minFontSize: 18,
  fontSizeStep: 2,
};

describe('getAutoSizeAmountFontSize', () => {
  it('keeps the maximum size before layout measurements are available', () => {
    expect(
      getAutoSizeAmountFontSize({
        ...DEFAULT_PARAMS,
        containerWidth: 0,
      })
    ).toBe(28);
    expect(
      getAutoSizeAmountFontSize({
        ...DEFAULT_PARAMS,
        textWidthAtMaxFontSize: 0,
      })
    ).toBe(28);
  });

  it('keeps the maximum size when the text fits exactly', () => {
    expect(getAutoSizeAmountFontSize(DEFAULT_PARAMS)).toBe(28);
  });

  it('steps down to the first size that fits', () => {
    expect(
      getAutoSizeAmountFontSize({
        ...DEFAULT_PARAMS,
        containerWidth: 90,
      })
    ).toBe(24);
  });

  it('uses the minimum size when no configured step fits', () => {
    expect(
      getAutoSizeAmountFontSize({
        ...DEFAULT_PARAMS,
        containerWidth: 50,
      })
    ).toBe(18);
  });

  it('supports different font ranges and step sizes', () => {
    expect(
      getAutoSizeAmountFontSize({
        containerWidth: 120,
        textWidthAtMaxFontSize: 160,
        maxFontSize: 32,
        minFontSize: 20,
        fontSizeStep: 4,
      })
    ).toBe(24);
  });
});
