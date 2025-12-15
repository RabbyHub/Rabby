import React from 'react';

export const TradingPanel: React.FC = () => {
  return (
    <div className="h-full w-full bg-rb-neutral-bg-1 flex flex-col overflow-hidden">
      <div className="border-b border-solid border-rb-neutral-line p-[16px] flex-shrink-0">
        <div className="text-r-neutral-title-1 text-[16px] font-medium">
          Trading Panel
        </div>
      </div>
      <div className="flex-1 overflow-auto p-[16px] min-h-0">
        <div className="text-r-neutral-foot text-[14px]">
          Order Form Placeholder
        </div>
      </div>
    </div>
  );
};
