import React from 'react';
import TooltipV6, {
  TooltipV6Placement,
} from '@/ui/component/Tooltip/TooltipV6';
import { DashedUnderlineText } from '../../DesktopPerps/components/DashedUnderlineText';

/**
 * Dashed-underline label with a hover tip. The simple perps detail page uses
 * this instead of ⓘ icons so every explained field reads the same way.
 */
export const PerpsTipLabel = ({
  tip,
  children,
  placement = 'top',
}: {
  tip: React.ReactNode;
  children: React.ReactNode;
  placement?: TooltipV6Placement;
}) => (
  <TooltipV6 overlayClassName="rectangle" placement={placement} title={tip}>
    <DashedUnderlineText needCursor={false}>{children}</DashedUnderlineText>
  </TooltipV6>
);
