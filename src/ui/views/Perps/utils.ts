import { MarketData } from '@/ui/models/perps';
import { Meta, AssetCtx, MarginTable } from '@rabby-wallet/hyperliquid-sdk';
import { PerpTopToken } from '@rabby-wallet/rabby-api/dist/types';
import { PERPS_MAX_NTL_VALUE } from './constants';

export const formatMarkData = (
  marketData: [Meta, AssetCtx[]],
  topAssets: PerpTopToken[]
): MarketData[] => {
  try {
    if (!Array.isArray(marketData) || marketData.length < 2) {
      console.error(
        'Failed to format market data: marketData is not an array or has less than 2 items'
      );
      return [];
    }

    const meta = marketData[0];
    const metrics = marketData[1];
    if (!meta || !Array.isArray(meta.universe) || !Array.isArray(metrics)) {
      console.error(
        'Failed to format market data: meta or metrics is not an array'
      );
      return [];
    }

    const marginTableMap: Record<number, MarginTable> = {};
    if (Array.isArray(meta.marginTables)) {
      for (const entry of meta.marginTables) {
        const [id, table] = entry || [];
        if (id != null) marginTableMap[id] = table;
      }
    }

    const result: MarketData[] = topAssets
      .map((topAsset) => {
        const index = topAsset.id;
        const hlDataAsset = meta.universe[index];

        if (!hlDataAsset) return null;

        if (hlDataAsset.isDelisted) return null;

        const m = metrics[index] || {};
        const table = marginTableMap[hlDataAsset?.marginTableId];
        const tiers = table?.marginTiers || [];
        const firstTier =
          Array.isArray(tiers) && tiers.length > 0 ? tiers[0] : undefined;
        const nextTier =
          Array.isArray(tiers) && tiers.length > 1 ? tiers[1] : undefined;

        const item: MarketData = {
          index,
          name: String(topAsset.name ?? ''),
          // 取保证金表第一档的最大杠杆；若无表则回退 asset.maxLeverage
          maxLeverage: Number(
            firstTier?.maxLeverage ?? hlDataAsset?.maxLeverage
          ),
          minLeverage: 1,
          // 第一档的最大名义值 = 下一档的 lowerBound；若不存在下一档则为兜底1000000
          maxUsdValueSize: String(nextTier?.lowerBound ?? PERPS_MAX_NTL_VALUE),
          szDecimals: Number(hlDataAsset.szDecimals ?? 0),
          // 根据 markPx 推断价格精度
          pxDecimals: (() => {
            const markPx = m?.markPx;
            if (!markPx) return 2;
            const parts = markPx.split('.');
            return parts.length > 1 ? parts[1].length : 2;
          })(),
          dayBaseVlm: String(m?.dayBaseVlm ?? '0'),
          dayNtlVlm: String(m?.dayNtlVlm ?? '0'),
          funding: String(m?.funding ?? '0'),
          markPx: String(m?.markPx ?? ''),
          midPx: String(m?.midPx ?? ''),
          openInterest: String(m?.openInterest ?? '0'),
          oraclePx: String(m?.oraclePx ?? ''),
          premium: String(m?.premium ?? '0'),
          prevDayPx: String(m?.prevDayPx ?? ''),
          logoUrl:
            topAsset.full_logo_url ||
            `https://app.hyperliquid.xyz/coins/${topAsset.name}.svg`,
        };
        return item;
      })
      .filter(Boolean) as MarketData[];

    console.log('format result', result);
    return result;
  } catch (e) {
    console.error('Failed to format market data:', e);
    return [];
  }
};

export const calLiquidationPrice = (
  markPrice: number,
  margin: number,
  direction: 'Long' | 'Short',
  positionSize: number,
  leverage: number,
  maxLeverage: number
) => {
  if (margin === 0) return 0;

  const MMR = 1 / maxLeverage / 2;
  const side = direction === 'Long' ? 1 : -1;
  const nationalValue = margin * leverage;
  const maintenance_margin_required = nationalValue * MMR;
  const margin_available = margin - maintenance_margin_required;
  const liq_price =
    markPrice - (side * margin_available) / positionSize / (1 - MMR * side);
  // liq_price = price - side * margin_available / position_size / (1 - l * side)
  return liq_price;
};
