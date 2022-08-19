import React, { ReactNode } from 'react';

interface ProcessTooltipProps {
  children: ReactNode;
}

const ProcessTooltip = ({ children }: ProcessTooltipProps) => {
  return <div className="process-tooltip">{children}</div>;
};

export default ProcessTooltip;
