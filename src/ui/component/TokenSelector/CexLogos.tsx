import { globalSupportCexList } from '@/ui/models/exchange';
import React, { useMemo } from 'react';

interface Props {
  cexIds: string[];
}
export const ExchangeLogos = ({ cexIds }: Props) => {
  const logos = useMemo(() => {
    return cexIds
      ?.map((id) => {
        const cex = globalSupportCexList.find((cex) => cex.id === id);
        return cex?.logo;
      })
      .filter(Boolean);
  }, [cexIds]);
  if (cexIds?.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-4 ml-[6px]">
      <div className="w-0 h-[12px] border-r border-r-r-neutral-line mr-[2px]" />
      {logos.slice(0, 4).map((url) => (
        <img
          key={url}
          src={url}
          alt=""
          className="w-[12px] h-[12px] rounded-full"
        />
      ))}
      {logos.length > 4 ? (
        <span className="text-r-neutral-foot text-[11px] font-medium whitespace-nowrap">
          +{logos.length - 4}
        </span>
      ) : null}
    </div>
  );
};
