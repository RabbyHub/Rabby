import { useRabbySelector } from '@/ui/store';
import { resolveSpotTokenLogo } from '../utils/spotLogos';

export const useSpotTokenLogo = (baseName: string | undefined) =>
  useRabbySelector((s) =>
    baseName ? resolveSpotTokenLogo(s.perps.marketDataMap, baseName) : ''
  );
