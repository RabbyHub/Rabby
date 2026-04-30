import React from 'react';
import { ReactComponent as RcIconUSDC } from '@/ui/assets/perps/IconUSDC.svg';
import { ReactComponent as RcIconUSDT } from '@/ui/assets/perps/IconUSDT.svg';
import { ReactComponent as RcIconUSDE } from '@/ui/assets/perps/IconUSDE.svg';
import { ReactComponent as RcIconUSDH } from '@/ui/assets/perps/IconUSDH.svg';
import { PerpsQuoteAsset } from '../constants';

export const QUOTE_ASSET_ICON_MAP: Record<PerpsQuoteAsset, React.FC<any>> = {
  USDC: RcIconUSDC,
  USDT: RcIconUSDT,
  USDE: RcIconUSDE,
  USDH: RcIconUSDH,
};
