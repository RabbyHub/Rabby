import { useCallback, useEffect } from 'react';
import { createGlobalState } from 'react-use';

const useGasLevel = createGlobalState<'normal' | 'slow' | 'fast' | 'custom'>(
  'normal'
);
const useCustomPrice = createGlobalState<Record<string, number>>({});

export const useMiniSignGasStore = () => {
  const [miniGasLevel, setMiniGasLevel] = useGasLevel();
  const [miniCustomPrice, setMiniCustomPrice] = useCustomPrice();

  const reset = useCallback(() => {
    setMiniGasLevel('normal');
    setMiniCustomPrice({});
  }, [setMiniGasLevel, setMiniCustomPrice]);

  const updateMiniCustomPrice = (chainServerId: string, value: number) => {
    setMiniCustomPrice((pre) => ({
      ...pre,
      [chainServerId]: value,
    }));
  };

  return {
    miniGasLevel,
    setMiniGasLevel,
    miniCustomPrice,
    setMiniCustomPrice,
    updateMiniCustomPrice,
    reset,
  };
};
// 内置功能签名
// - 页面记忆 Instant/Fast/Normal, 重进页面前有效；
// - 链记忆 Custom，切链或重进页面前有效；
// - 每次重进页面重置为默认档位 Fast。
export const useClearMiniGasStateEffect = ({
  chainServerId,
  fromTokenId,
  toTokenId,
}: {
  chainServerId?: string;
  fromTokenId: string;
  toTokenId: string;
}) => {
  const { setMiniGasLevel, reset } = useMiniSignGasStore();
  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    setMiniGasLevel('normal');
  }, [chainServerId, fromTokenId, toTokenId]);
};
