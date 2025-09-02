import { useCallback, useEffect, useState } from 'react';
import { createGlobalState } from 'react-use';

const useGasLevel = createGlobalState<'normal' | 'slow' | 'fast' | 'custom'>(
  'normal'
);
const useCustomPrice = createGlobalState<number>(0);

export const useMiniSignGasStore = () => {
  const [miniGasLevel, setMiniGasLevel] = useGasLevel();
  const [miniCustomPrice, setMiniCustomPrice] = useCustomPrice();

  const reset = useCallback(() => {
    setMiniGasLevel('normal');
    setMiniCustomPrice(0);
  }, [setMiniGasLevel, setMiniCustomPrice]);

  // const updateMiniCustomPrice = setMiniCustomPrice

  return {
    miniGasLevel,
    setMiniGasLevel,
    miniCustomPrice,
    setMiniCustomPrice,
    updateMiniCustomPrice: setMiniCustomPrice,
    reset,
  };
};
// 内置功能签名
// - 页面记忆 Instant/Fast/Normal, 重进页面前有效；
// - 链记忆 Custom，切链或重进页面前有效；
// - 每次重进页面重置为默认档位 Fast。
export const useClearMiniGasStateEffect = ({
  chainServerId,
}: {
  chainServerId?: string;
}) => {
  const { reset, miniGasLevel } = useMiniSignGasStore();
  useEffect(() => {
    reset();

    return reset;
  }, []);

  const [previousChainServerId, setPreviousChainServerId] = useState(
    chainServerId
  );

  if (previousChainServerId !== chainServerId) {
    setPreviousChainServerId(chainServerId);
    if (miniGasLevel === 'custom') {
      reset();
    }
  }
};
