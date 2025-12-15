import React from 'react';

export const AccountInfo: React.FC = () => {
  return (
    <div className="w-[360px] h-full bg-rb-neutral-bg-2 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="border-b border-solid border-rb-neutral-line p-[16px] flex-shrink-0">
        <div className="text-r-neutral-title-1 text-[14px] font-medium">
          Account Info
        </div>
      </div>
      <div className="flex-1 overflow-auto p-[16px] min-h-0">
        <div className="text-r-neutral-foot text-[12px]">
          Account Balance & Stats Placeholder
        </div>
      </div>
    </div>
  );
};
