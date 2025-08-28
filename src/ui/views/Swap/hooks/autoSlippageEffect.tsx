import { useEffect } from 'react';

export const useAutoSlippageEffect = ({
  chainServerId,
  fromTokenId,
  toTokenId,
  onSetAutoSlippage,
}: {
  chainServerId: string;
  fromTokenId: string;
  toTokenId: string;
  onSetAutoSlippage: () => void;
}) => {
  // 切链、切币对或重进页面时，手动设置的滑点(如有)重置为 Auto。
  useEffect(() => {
    onSetAutoSlippage();
  }, [chainServerId, fromTokenId, toTokenId, onSetAutoSlippage]);
};
