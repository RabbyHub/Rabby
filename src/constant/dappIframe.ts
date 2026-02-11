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

export const INNER_DAPP_IDS = {
  POLYMARKET: 'polymarket',
  OPINION: 'opinion',
  PROBABLE: 'probable',
  AAVE: 'aave',
  SPARK: 'spark',
  VENUS: 'venus',
  HYPERLIQUID: 'hyperliquid',
  ASTER: 'aster',
  LIGHTER: 'lighter',
} as const;

export type INNER_DAPP_ID = typeof INNER_DAPP_IDS[keyof typeof INNER_DAPP_IDS];

export type DappSelectItem = {
  id: INNER_DAPP_ID;
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
    id: INNER_DAPP_IDS.POLYMARKET,
    name: 'Polymarket',
    icon: PngPolymarket,
    url: 'https://polymarket.com/',
    TVL: '$370M',
    NavIcon: RcIconPredictionCC,
  },
  {
    id: INNER_DAPP_IDS.PROBABLE,
    name: 'Probable',
    icon: PngProbable,
    url: 'https://probable.markets',

    TVL: '$21M',
    NavIcon: RcIconProbableCC,
  },
];

const LENDING: DappSelectItem[] = [
  {
    id: INNER_DAPP_IDS.AAVE,
    name: 'Aave',
    icon: PngAave,
    url: 'https://app.aave.com',
    TVL: '$33.803b',
    NavIcon: RcIconLeadingCC,
  },
  {
    id: INNER_DAPP_IDS.SPARK,
    name: 'Spark',
    icon: PngSpark,
    url: 'https://app.spark.fi/my-portfolio',
    TVL: '$5.977b',
    NavIcon: RcIconSparkCC,
  },
  {
    id: INNER_DAPP_IDS.VENUS,
    name: 'Venus',
    icon: PngVenus,
    url: 'https://venus.io',
    TVL: '$1.635b',
    NavIcon: RcIconVenusCC,
  },
];

const PERPS: DappSelectItem[] = [
  {
    id: INNER_DAPP_IDS.HYPERLIQUID,
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
    id: INNER_DAPP_IDS.LIGHTER,
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

export const DEFAULT_INNER_DAPP_ID = {
  prediction: INNER_DAPP_IDS.POLYMARKET,
  lending: INNER_DAPP_IDS.AAVE,
  perps: INNER_DAPP_IDS.HYPERLIQUID,
} as const;

export const ALL_SUPPORTED_INNER_DAPP_ORIGINS = [
  ...PREDICTION.map((item) => new URL(item.url).origin),
  ...LENDING.map((item) => new URL(item.url).origin),
  ...PERPS.map((item) => new URL(item.url).origin),
];
