import React from 'react';
import { Tooltip } from 'antd';
import { TooltipProps } from 'antd/lib/tooltip';

/**
 * Wrapper around antd Tooltip.
 *
 * TODO: Make tooltip follow anchor when parent scroll container scrolls.
 * Current limitation: tooltip stays in place when .ant-table-body scrolls.
 */
export const ScrollAwareTooltip: React.FC<
  TooltipProps & { extraTip?: never }
> = ({ children, ...props }) => {
  return <Tooltip {...props}>{children}</Tooltip>;
};
