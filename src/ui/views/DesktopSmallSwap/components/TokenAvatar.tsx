import React from 'react';

export const TokenAvatar = ({
  symbol,
  tone,
  chainTone,
}: {
  symbol: string;
  tone: string;
  chainTone: string;
}) => {
  const label = symbol.replace(/[^A-Z]/g, '').slice(0, 2) || symbol.slice(0, 2);

  return (
    <div className="relative w-[24px] h-[24px] flex-shrink-0">
      <div
        className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
        style={{ backgroundColor: tone }}
      >
        {label}
      </div>
      <span
        className="absolute right-[-1px] bottom-[-1px] w-[10px] h-[10px] rounded-full border border-white"
        style={{ backgroundColor: chainTone }}
      />
    </div>
  );
};
