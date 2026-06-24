import React from 'react';

// Color thresholds for the margin/account ratio gauge. Three equal zones —
// >=66.7% danger, >=33.3% warning, else healthy. (Rabby's 3-zone display; the
// numeric ratio value/% itself matches the Hyperliquid frontend.)
const RATIO_DANGER = 2 / 3;
const RATIO_WARNING = 1 / 3;

// Exact hex from the design spec (iOS-style system colors).
const GAUGE_GREEN = '#58C669';
const GAUGE_ORANGE = '#FF9F0A';
const GAUGE_RED = '#FF453A';

export const ratioColor = (ratio: number) => {
  if (ratio >= RATIO_DANGER) return GAUGE_RED;
  if (ratio >= RATIO_WARNING) return GAUGE_ORANGE;
  return GAUGE_GREEN;
};

/**
 * 270° gauge (C-shape, 90° gap at bottom) per design spec. Three filled-arc
 * segments (green / orange / red) traced as the original 14×14 vector. The
 * needle rotates proportional to `ratio` ∈ [0,1]:
 *   ratio = 0   → points to the green-zone start (lower-left, ~225° math)
 *   ratio = 0.5 → points straight up
 *   ratio = 1   → mirrors to the red-zone end (lower-right)
 * Needle + pivot use `currentColor` so callers can theme via wrapper.
 */
export const RatioGaugeIcon: React.FC<{ ratio: number }> = ({ ratio }) => {
  const clamped = Math.max(0, Math.min(1, isFinite(ratio) ? ratio : 0));
  // The static needle path already sits at the ratio=0 position. Rotate
  // CW around the pivot (7,7) by `clamped * 270°` to sweep across the
  // 270° arc.
  const needleAngle = clamped * 270;

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M12.0239 3.31396C13.0137 4.46988 13.612 5.97091 13.612 7.612C13.612 9.07327 13.1374 10.4234 12.3347 11.5179L11.3859 10.569C11.9562 9.72484 12.2895 8.70743 12.2895 7.612C12.2895 6.33618 11.8376 5.16611 11.0854 4.25244L12.0239 3.31396Z"
        fill={GAUGE_RED}
      />
      <path
        d="M7.00052 1C8.53497 1 9.94713 1.52295 11.0691 2.39996L10.1246 3.34446C9.24907 2.70249 8.1694 2.32247 7.00052 2.32247C5.90505 2.32247 4.88727 2.65536 4.04304 3.22564L3.09424 2.27684C4.18874 1.47417 5.53922 1 7.00052 1Z"
        fill={GAUGE_ORANGE}
      />
      <path
        d="M3.04647 4.0988C2.21572 5.03312 1.71066 6.26346 1.71066 7.61205C1.71066 8.78093 2.09067 9.8606 2.73264 10.7361L1.78814 11.6806C0.911132 10.5587 0.388184 9.1465 0.388184 7.61205C0.388184 5.89823 1.03981 4.33636 2.10929 3.16162L3.04647 4.0988Z"
        fill={GAUGE_GREEN}
      />
      <g transform={`rotate(${needleAngle} 7 7)`}>
        <line
          x1="6.66168"
          y1="7.48562"
          x2="2.09979"
          y2="11.9736"
          stroke="currentColor"
          strokeWidth="0.881621"
        />
      </g>
      <circle cx="7" cy="7" r="1.54307" fill="currentColor" />
    </svg>
  );
};
