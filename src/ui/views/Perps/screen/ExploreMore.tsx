import React from 'react';
import { useHistory } from 'react-router-dom';
import { useRabbySelector } from '@/ui/store';
import { PageHeader } from '@/ui/component';
import { formatUsdValueKMB } from '@/ui/views/Dashboard/components/TokenDetailPopup/utils';
import { TokenImg } from '../components/TokenImg';
import { getHyperliquidCoinLogoUrl } from '../utils';

const Row: React.FC<{
  index: number;
  logoUrl: string;
  name: string;
  displayName?: string;
  quoteAsset?: string;
  leverage: number;
  volume: number;
  onClick: () => void;
}> = ({
  index,
  logoUrl,
  name,
  displayName,
  quoteAsset,
  leverage,
  volume,
  onClick,
}) => {
  const base = displayName || name;
  const quote = quoteAsset || 'USDC';
  return (
    <div
      className="flex items-center justify-between py-[12px] px-[16px] rounded-[8px] bg-r-neutral-card1 cursor-pointer
        rounded-[8px]
        border-[1px]
        border-solid
        border-transparent
        hover:bg-r-blue-light1
        hover:border-rabby-blue-default
      "
      onClick={onClick}
    >
      <div className="flex items-center gap-[12px]">
        <div className="w-[20px] text-13 text-r-neutral-foot">{index}</div>
        <TokenImg size={28} logoUrl={logoUrl} />
        <div className="flex flex-col leading-[18px]">
          <div className="text-15 font-medium">
            <span className="text-r-neutral-title-1">{base}</span>
            <span className="text-r-neutral-foot">/{quote}</span>
          </div>
          <div className="text-12 text-r-neutral-foot">{leverage}x</div>
        </div>
      </div>
      <div className="text-15 text-r-neutral-title-1 font-medium">
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
        <div className="px-[16px] text-13 text-r-neutral-body pb-[8px] flex items-center">
          <div className="w-[38px]">#</div>
          <div className="flex-1">Perps</div>
          <div className="w-[100px] text-right">24h Volume</div>
        </div>
        <div className="pb-[16px] gap-8 flex flex-col">
          {sorted.map((m, i) => (
            <Row
              key={m.name}
              index={i + 1}
              logoUrl={m.logoUrl || getHyperliquidCoinLogoUrl(m.name)}
              name={m.name}
              displayName={m.displayName}
              quoteAsset={m.quoteAsset}
              leverage={m.maxLeverage}
              volume={Number(m.dayNtlVlm || 0)}
              onClick={() =>
                history.push(`/perps/single-coin/${m.name}?openPosition=true`)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExploreMore;
