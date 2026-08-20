import { ETH_USDT_CONTRACT } from '@/constant';
import { DEFAULT_SWAP_TO_TOKEN_ITEM_BY_CHAIN_SERVER_ID } from '@/constant/dex-swap';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

const SUPPORTED_STABLECOINS = [
  {
    symbol: 'USDC',
    src:
      'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
  },
  {
    symbol: 'USDT',
    src:
      'https://static.debank.com/image/coin/logo_url/usdt/23af7472292cb41dc39b3f1146ead0fe.png',
  },
  {
    symbol: 'USD1',
    src:
      'https://static-assets.rabby.io/files/6a499840-3f0d-4640-9a30-aec184311cb0.png',
  },
  {
    symbol: 'USDe',
    src:
      'https://static.debank.com/image/eth_token/logo_url/0x4c9edd5852cd905f086c759e8383e09bff1e68b3/1228d6e73f70f37ec1f6fe02a3bbe6ff.png',
  },
  {
    symbol: 'USDS',
    src:
      'https://static.debank.com/image/eth_token/logo_url/0xdc035d45d973e3ec169d2276ddab16f1e407384f/78fbc2e73e33fa80fcecfaafa2074887.png',
  },
] as const;

const SUPPORTED_STABLECOIN_ICONS = SUPPORTED_STABLECOINS.map(
  (token) => token.src
);

const getRandomTokenIndex = (excludedIndices: number[]) => {
  const candidates = SUPPORTED_STABLECOINS.map((_, index) => index).filter(
    (index) => !excludedIndices.includes(index)
  );

  return candidates[Math.floor(Math.random() * candidates.length)];
};

const STABLECOIN_SWAP_ROUTE = `/dex-swap?${new URLSearchParams({
  chain: 'eth',
  payTokenId: DEFAULT_SWAP_TO_TOKEN_ITEM_BY_CHAIN_SERVER_ID.eth.id,
  receiveTokenId: ETH_USDT_CONTRACT,
  rbisource: 'dashboard',
}).toString()}`;

const STABLECOIN_SWAP_POPUP_DISMISSED_KEY =
  'rabby:dashboard:ad:stablecoin-swap-popup:dismissed';

export const useStablecoinSwapPopup = () => {
  const history = useHistory();
  const [visible, setVisible] = useState(
    () =>
      window.localStorage.getItem(STABLECOIN_SWAP_POPUP_DISMISSED_KEY) !== '1'
  );
  const payTokenIndexRef = useRef(0);
  const receiveTokenIndexRef = useRef(1);
  const nextTokenSideRef = useRef<'pay' | 'receive'>('receive');
  const [payTokenIndex, setPayTokenIndex] = useState(0);
  const [receiveTokenIndex, setReceiveTokenIndex] = useState(1);
  const [previousPayTokenIndex, setPreviousPayTokenIndex] = useState<
    number | null
  >(null);
  const [previousReceiveTokenIndex, setPreviousReceiveTokenIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = window.setInterval(() => {
      if (nextTokenSideRef.current === 'receive') {
        const currentIndex = receiveTokenIndexRef.current;
        const nextIndex = getRandomTokenIndex([
          currentIndex,
          payTokenIndexRef.current,
        ]);

        setPreviousReceiveTokenIndex(currentIndex);
        receiveTokenIndexRef.current = nextIndex;
        setReceiveTokenIndex(nextIndex);
        nextTokenSideRef.current = 'pay';
        return;
      }

      const currentIndex = payTokenIndexRef.current;
      const nextIndex = getRandomTokenIndex([
        currentIndex,
        receiveTokenIndexRef.current,
      ]);

      setPreviousPayTokenIndex(currentIndex);
      payTokenIndexRef.current = nextIndex;
      setPayTokenIndex(nextIndex);
      nextTokenSideRef.current = 'receive';
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

  const onPayTokenAnimationEnd = useMemoizedFn(() => {
    setPreviousPayTokenIndex(null);
  });

  const onReceiveTokenAnimationEnd = useMemoizedFn(() => {
    setPreviousReceiveTokenIndex(null);
  });

  const previousPayToken =
    previousPayTokenIndex === null
      ? null
      : SUPPORTED_STABLECOINS[previousPayTokenIndex];
  const previousReceiveToken =
    previousReceiveTokenIndex === null
      ? null
      : SUPPORTED_STABLECOINS[previousReceiveTokenIndex];

  return {
    visible,
    onClose,
    onSwap,
    supportedStablecoinIcons: SUPPORTED_STABLECOIN_ICONS,
    payToken: SUPPORTED_STABLECOINS[payTokenIndex],
    previousPayToken,
    receiveToken: SUPPORTED_STABLECOINS[receiveTokenIndex],
    previousReceiveToken,
    onPayTokenAnimationEnd,
    onReceiveTokenAnimationEnd,
  };
};
