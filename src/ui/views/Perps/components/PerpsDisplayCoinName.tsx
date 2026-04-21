import React from 'react';
import clsx from 'clsx';
import { MarketData } from '@/ui/models/perps';
import { formatPerpsCoin } from '../../DesktopPerps/utils';

interface Props {
  item?: Pick<MarketData, 'name' | 'displayName' | 'quoteAsset'> | null;
  /** Separator rendered between base and quote (default `/`). */
  separator?: string;
  /** Extra classname for the wrapper span. */
  className?: string;
  /** Classname for base part. Defaults to text-r-neutral-title1 */
  baseClassName?: string;
  /** Classname for quote part. Defaults to text-r-neutral-foot */
  quoteClassName?: string;
  showDexTag?: boolean;
}

/**
 * Canonical BASE/QUOTE display for perps markets.
 * Examples:
 *   BTC (USDC)         → "BTC/USDC"
 *   xyz:TSLA (USDC)    → "TSLA/USDC"  (displayName is "TSLA")
 *   HYPE  (USDH)       → "HYPE/USDH"
 */
export const PerpsDisplayCoinName: React.FC<Props> = ({
  item,
  separator = '/',
  className,
  baseClassName,
  quoteClassName,
  showDexTag = false,
}) => {
  const base = formatPerpsCoin(item?.displayName || item?.name || '');
  const quote = item?.quoteAsset || 'USDC';
  const dexName = item?.name.split(':')[0];
  return (
    <span className={clsx('inline-flex items-center')}>
      <span className={clsx('inline-flex items-baseline', className)}>
        <span className={clsx('text-r-neutral-title-1', baseClassName)}>
          {base}
        </span>
        <span className={clsx('text-r-neutral-foot', quoteClassName)}>
          {separator}
          {quote}
        </span>
      </span>
      {Boolean(dexName) && showDexTag && (
        <span className="ml-8 px-6 h-[18px] flex items-center text-12 font-medium text-rb-brand-default bg-rb-brand-light-1 rounded-[4px]">
          {dexName}
        </span>
      )}
    </span>
  );
};

export default PerpsDisplayCoinName;
