import PngPolymarket from 'ui/assets/prediction/polymarket.png';
import PngOpinion from 'ui/assets/prediction/opinion.png';
import PngProbable from 'ui/assets/prediction/probable.png';

import PngHyperliquid from 'ui/assets/perps/hyperliquid.png';
import PngAster from 'ui/assets/perps/aster.png';
import PngLighter from 'ui/assets/perps/lighter.png';
import PngAave from 'ui/assets/lending/aave.png';
import PngSpark from 'ui/assets/lending/spark.png';
import PngVenus from 'ui/assets/lending/venus.png';
import {
  RcIconLeadingCC,
  RcIconSparkCC,
  RcIconVenusCC,
  RcIconPredictionCC,
  RcIconProbableCC,
  RcIconOpinionCC,
  RcIconPerpsCC,
  RcIconAsterCC,
  RcIconLighterCC,
} from '@/ui/assets/desktop/nav';

export type DappSelectItem = {
  id: string;
  name: string;
  icon: string;
  url: string;
  onPress?: (item: DappSelectItem) => void;
  TVL: string;
  value?: string;
  NavIcon: typeof RcIconLeadingCC;
};

const PREDICTION: DappSelectItem[] = [
  {
    id: 'polymarket',
    name: 'Polymarket',
    icon: PngPolymarket,
    url: 'https://polymarket.com/',
    TVL: '$370M',
    NavIcon: RcIconPredictionCC,
  },
  {
    id: 'probable',
    name: 'Probable',
    icon: PngProbable,
    url: 'https://probable.markets',

    TVL: '$21M',
    NavIcon: RcIconProbableCC,
  },
];

const LENDING: DappSelectItem[] = [
  {
    id: 'aave',
    name: 'Aave',
    icon: PngAave,
    url: 'https://app.aave.com',
    TVL: '$33.803b',
    NavIcon: RcIconLeadingCC,
  },
  {
    id: 'spark',
    name: 'Spark',
    icon: PngSpark,
    url: 'https://app.spark.fi/my-portfolio',
    TVL: '$5.977b',
    NavIcon: RcIconSparkCC,
  },
  {
    id: 'venus',
    name: 'Venus',
    icon: PngVenus,
    url: 'https://venus.io',
    TVL: '$1.635b',
    NavIcon: RcIconVenusCC,
  },
];

const PERPS: DappSelectItem[] = [
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    icon: PngHyperliquid,
    url: 'https://app.hyperliquid.xyz/',
    TVL: '$156.396b',
    NavIcon: RcIconPerpsCC,
  },
  // {
  //   id: 'aster',
  //   name: 'Aster',
  //   icon: PngAster,
  //   url: 'https://www.asterdex.com/trade/pro/futures/BTCUSDT',
  //   TVL: '$124.388b',
  //   NavIcon: RcIconAsterCC,
  // },
  {
    id: 'lighter',
    name: 'Lighter',
    icon: PngLighter,
    url: 'https://app.lighter.xyz/trade/LIT_USDC',
    TVL: '$116.548b',
    NavIcon: RcIconLighterCC,
  },
];

export const INNER_DAPP_LIST = {
  PREDICTION,
  LENDING,
  PERPS,
} as const;

export const ALL_SUPPORTED_INNER_DAPP_ORIGINS = [
  ...PREDICTION.map((item) => new URL(item.url).origin),
  ...LENDING.map((item) => new URL(item.url).origin),
  ...PERPS.map((item) => new URL(item.url).origin),
];
