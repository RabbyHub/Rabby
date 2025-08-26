import React from 'react';
import { useHistory } from 'react-router-dom';
import { useRabbySelector } from '@/ui/store';
import { PageHeader } from '@/ui/component';
import { formatUsdValueKMB } from '@/ui/views/Dashboard/components/TokenDetailPopup/utils';

const Row: React.FC<{
  index: number;
  logoUrl: string;
  name: string;
  leverage: number;
  volume: number;
  onClick: () => void;
}> = ({ index, logoUrl, name, leverage, volume, onClick }) => {
  return (
    <div
      className="flex items-center justify-between py-[12px] px-[16px] rounded-[8px] bg-r-neutral-card1 cursor-pointer
        rounded-[8px]
        border-[1px]
        border-solid
        border-transparent
        hover:border-rabby-blue-default 
      "
      onClick={onClick}
    >
      <div className="flex items-center gap-[12px]">
        <div className="w-[20px] text-13 text-r-neutral-foot">{index}</div>
        <img
          src={logoUrl}
          alt={name}
          className="w-[28px] h-[28px] rounded-full"
        />
        <div className="flex flex-col leading-[18px]">
          <div className="text-15 text-r-neutral-title font-medium">
            {name} - USD
          </div>
          <div className="text-12 text-r-neutral-foot">{leverage}x</div>
        </div>
      </div>
      <div className="text-15 text-r-neutral-title font-medium">
        {formatUsdValueKMB(volume)}
      </div>
    </div>
  );
};

export const ExploreMore: React.FC = () => {
  const history = useHistory();
  const { marketData } = useRabbySelector((s) => s.perps);

  const sorted = React.useMemo(() => {
    return [...marketData].sort(
      (a, b) => Number(b.dayNtlVlm || 0) - Number(a.dayNtlVlm || 0)
    );
  }, [marketData]);

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader className="mx-[20px] pt-[20px] mb-[20px]" forceShowBack>
        Perps
      </PageHeader>

      <div className="flex-1 overflow-auto mx-20">
        <div className="px-[16px] text-13 text-r-neutral-body py-[8px] flex items-center">
          <div className="w-[38px]">#</div>
          <div className="flex-1">Perps</div>
          <div className="w-[100px] text-right">24h Volume</div>
        </div>
        <div className="pb-[16px] gap-8 flex flex-col">
          {sorted.map((m, i) => (
            <Row
              key={m.name}
              index={i + 1}
              logoUrl={
                m.logoUrl || `https://app.hyperliquid.xyz/coins/${m.name}.svg`
              }
              name={m.name}
              leverage={m.maxLeverage}
              volume={Number(m.dayNtlVlm || 0)}
              onClick={() => history.push(`/perps/single-coin/${m.name}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExploreMore;
