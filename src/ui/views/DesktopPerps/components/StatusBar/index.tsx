import React from 'react';

export const StatusBar: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[32px] border-t border-solid border-rb-neutral-line bg-rb-neutral-bg-2 flex items-center px-[16px] z-50">
      <div className="flex items-center gap-[16px] text-[12px] text-r-neutral-foot">
        <div className="flex items-center gap-[4px]">
          <span className="w-[8px] h-[8px] rounded-full bg-r-green-default"></span>
          <span>Connected</span>
        </div>
        <div>Network Status</div>
      </div>
    </div>
  );
};
