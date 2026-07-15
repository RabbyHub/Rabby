export const getSignMessageAddressTagLayouts = (
  anchors: Array<{ lineTop: number; anchorHeight: number }>,
  viewport: {
    contentTop: number;
    scrollTop: number;
    viewportHeight: number;
  }
) => {
  const lineOffsets = new Map<number, number>();

  return anchors.map(({ lineTop, anchorHeight }) => {
    const lineOffset = lineOffsets.get(lineTop) || 0;
    const center = lineTop - viewport.scrollTop + anchorHeight / 2;
    lineOffsets.set(lineTop, lineOffset + 1);

    return {
      right: -14 + lineOffset * 44,
      top: viewport.contentTop + center,
      visible: center >= 0 && center <= viewport.viewportHeight,
    };
  });
};
