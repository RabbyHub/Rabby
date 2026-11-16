import React from 'react';
import clsx from 'clsx';
import { placements as rcPlacements } from 'rc-tooltip/lib/placements';
import TooltipV6, { TooltipV6Props } from '@/ui/component/Tooltip/TooltipV6';

// Hover-tip spec for the Perps pro page (design review 26.11):
//   - the arrow tip sits 3px from the trigger;
//   - the arrow points at the trigger's center;
//   - edge-aligned bubbles keep the arrow 6px clear of the bubble edge.
// The visible arrow is 16px wide (see style/antd-overwrite.less), so "6px
// clear" puts the bubble edge 8 + 6 = 14px past the trigger's center. Anchoring
// the edge placements to the trigger's *center* point (`tc` / `bc`) instead of
// its corner expresses that without measuring the trigger.
const GAP = 3;
const EDGE = 14;

const overflow = { adjustX: 1, adjustY: 1 };
const targetOffset = [0, 0];

// Passed as `builtinPlacements` rather than `align`: rc-trigger derives the
// `ant-tooltip-placement-*` class (which orients the arrow) by matching the
// aligned points against this table, and it flips between these entries when
// the bubble would overflow the viewport.
const PLACEMENTS: NonNullable<TooltipV6Props['builtinPlacements']> = {
  ...rcPlacements,
  top: { points: ['bc', 'tc'], offset: [0, -GAP], overflow, targetOffset },
  bottom: { points: ['tc', 'bc'], offset: [0, GAP], overflow, targetOffset },
  left: { points: ['cr', 'cl'], offset: [-GAP, 0], overflow, targetOffset },
  right: { points: ['cl', 'cr'], offset: [GAP, 0], overflow, targetOffset },
  topLeft: {
    points: ['bl', 'tc'],
    offset: [-EDGE, -GAP],
    overflow,
    targetOffset,
  },
  topRight: {
    points: ['br', 'tc'],
    offset: [EDGE, -GAP],
    overflow,
    targetOffset,
  },
  bottomLeft: {
    points: ['tl', 'bc'],
    offset: [-EDGE, GAP],
    overflow,
    targetOffset,
  },
  bottomRight: {
    points: ['tr', 'bc'],
    offset: [EDGE, GAP],
    overflow,
    targetOffset,
  },
};

const isEmptyTitle = (title: React.ReactNode) =>
  title === null || title === undefined || title === false || title === '';

/**
 * Tooltip for the Perps pro page. Same props as antd's Tooltip for the cases
 * used here; styling lives under `.perps-pro-tooltip` in ../../index.less.
 */
export const PerpsTooltip: React.FC<TooltipV6Props> = ({
  title,
  overlayClassName,
  children,
  ...rest
}) => {
  // rc-tooltip would still pop an empty bubble; antd's Tooltip suppresses it.
  if (isEmptyTitle(title)) {
    return children;
  }

  return (
    <TooltipV6
      title={title}
      overlayClassName={clsx('rectangle perps-pro-tooltip', overlayClassName)}
      builtinPlacements={PLACEMENTS}
      arrowEdgeInset={EDGE}
      // antd's Tooltip default; rc-tooltip alone opens instantly, which flashes
      // bubbles while the cursor merely crosses the market header.
      mouseEnterDelay={0.1}
      {...rest}
    >
      {children}
    </TooltipV6>
  );
};

export default PerpsTooltip;
