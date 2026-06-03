/**
 * Hyperliquid 币种 logo URL 工具(shared)
 *
 * 主要由 SW perpsLive(content-script 通过 broadcast 间接消费)使用,
 * Perps UI 也通过 `src/ui/views/Perps/utils.ts` re-export 此处。
 *
 * 当 DeBank openapi `getPerpTokenDetail.full_logo_url` 不可用或不存在时,
 * 兜底使用 Hyperliquid 官方 SVG。
 */

const HL_LOGO_BASE = 'https://app.hyperliquid.xyz/coins/';

/**
 * 处理 Hyperliquid meme perps 命名约定:`kPEPE` → `PEPE`(去掉前缀 k)。
 * `km:` 前缀的不处理(那是 builder dex naming)。
 */
export const normalizeHyperliquidCoinForLogo = (coin: string): string => {
  if (!coin) return '';
  if (coin.startsWith('k') && !coin.startsWith('km:')) {
    return coin.slice(1);
  }
  return coin;
};

export const getHyperliquidCoinLogoUrl = (coin: string): string => {
  const key = normalizeHyperliquidCoinForLogo(coin);
  if (!key) return '';
  return `${HL_LOGO_BASE}${key}.svg`;
};
