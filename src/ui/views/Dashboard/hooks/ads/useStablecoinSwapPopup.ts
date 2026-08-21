import { ETH_USDT_CONTRACT } from '@/constant';
import { DEFAULT_SWAP_TO_TOKEN_ITEM_BY_CHAIN_SERVER_ID } from '@/constant/dex-swap';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

const TOKEN_ICON_URLS = {
  usdc:
    'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
  usdt:
    'https://static.debank.com/image/coin/logo_url/usdt/23af7472292cb41dc39b3f1146ead0fe.png',
  usd1:
    'https://static-assets.rabby.io/files/6a499840-3f0d-4640-9a30-aec184311cb0.png',
  usde:
    'https://static.debank.com/image/eth_token/logo_url/0x4c9edd5852cd905f086c759e8383e09bff1e68b3/1228d6e73f70f37ec1f6fe02a3bbe6ff.png',
  usds:
    'https://static.debank.com/image/eth_token/logo_url/0xdc035d45d973e3ec169d2276ddab16f1e407384f/78fbc2e73e33fa80fcecfaafa2074887.png',
} as const;

const SUPPORTED_STABLECOIN_ICONS = [
  TOKEN_ICON_URLS.usdc,
  TOKEN_ICON_URLS.usdt,
  TOKEN_ICON_URLS.usd1,
  TOKEN_ICON_URLS.usde,
  TOKEN_ICON_URLS.usds,
];

const ROTATING_STABLECOIN_ICONS = [
  { symbol: 'USDT', src: TOKEN_ICON_URLS.usdt },
  { symbol: 'USD1', src: TOKEN_ICON_URLS.usd1 },
  { symbol: 'USDe', src: TOKEN_ICON_URLS.usde },
  { symbol: 'USDS', src: TOKEN_ICON_URLS.usds },
] as const;

const STABLECOIN_SWAP_ROUTE = `/dex-swap?${new URLSearchParams({
  chain: 'eth',
  payTokenId: DEFAULT_SWAP_TO_TOKEN_ITEM_BY_CHAIN_SERVER_ID.eth.id,
  receiveTokenId: ETH_USDT_CONTRACT,
  rbisource: 'dashboard',
}).toString()}`;

const STABLECOIN_SWAP_POPUP_DISMISSED_KEY =
  'rabby:dashboard:stablecoin-swap-popup:dismissed';

export const useStablecoinSwapPopup = () => {
  const history = useHistory();
  const [visible, setVisible] = useState(
    () =>
      window.localStorage.getItem(STABLECOIN_SWAP_POPUP_DISMISSED_KEY) !== '1'
  );
  const rotatingTokenIndexRef = useRef(0);
  const [rotatingTokenIndex, setRotatingTokenIndex] = useState(0);
  const [previousRotatingTokenIndex, setPreviousRotatingTokenIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = window.setInterval(() => {
      const currentIndex = rotatingTokenIndexRef.current;
      const randomOffset =
        Math.floor(Math.random() * (ROTATING_STABLECOIN_ICONS.length - 1)) + 1;
      const nextIndex =
        (currentIndex + randomOffset) % ROTATING_STABLECOIN_ICONS.length;

      setPreviousRotatingTokenIndex(currentIndex);
      rotatingTokenIndexRef.current = nextIndex;
      setRotatingTokenIndex(nextIndex);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [visible]);

  const onClose = useMemoizedFn(() => {
    window.localStorage.setItem(STABLECOIN_SWAP_POPUP_DISMISSED_KEY, '1');
    setVisible(false);
  });

  const onSwap = useMemoizedFn(() => {
    history.push(STABLECOIN_SWAP_ROUTE);
  });

  const onTokenAnimationEnd = useMemoizedFn(() => {
    setPreviousRotatingTokenIndex(null);
  });

  const rotatingToken = ROTATING_STABLECOIN_ICONS[rotatingTokenIndex];
  const previousRotatingToken =
    previousRotatingTokenIndex === null
      ? null
      : ROTATING_STABLECOIN_ICONS[previousRotatingTokenIndex];

  return {
    visible,
    onClose,
    onSwap,
    payTokenIcon: TOKEN_ICON_URLS.usdc,
    supportedStablecoinIcons: SUPPORTED_STABLECOIN_ICONS,
    rotatingToken,
    previousRotatingToken,
    onTokenAnimationEnd,
  };
};
