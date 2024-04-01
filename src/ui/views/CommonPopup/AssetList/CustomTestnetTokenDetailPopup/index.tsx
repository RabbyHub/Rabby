import { CustomTestnetToken } from '@/background/service/customTestnet';
import { Popup } from '@/ui/component';
import { isSameAddress, useWallet } from '@/ui/utils';
import React from 'react';
import { useRabbyDispatch } from 'ui/store';
import './style.less';
import { CustomTestnetTokenDetail } from './CustomTestnetTokenDetail';
import { useMemoizedFn, useRequest } from 'ahooks';

interface TokenDetailProps {
  visible?: boolean;
  onClose?(): void;
  token?: CustomTestnetToken | null;
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
  isAdded?: boolean;
  onAdd?(token: CustomTestnetToken): void;
  onRemove?(token: CustomTestnetToken): void;
}
export const CustomTestnetTokenDetailPopup = ({
  token,
  visible,
  onClose,
  onAdd,
  onRemove,
}: TokenDetailProps) => {
  const wallet = useWallet();

  const { data: isAdded, runAsync: runCheckIsAdded } = useRequest(
    async () => {
      if (token) {
        const res = await wallet.isAddedCustomTestnetToken(token);
        return res;
      } else {
        return false;
      }
    },
    {
      refreshDeps: [token],
    }
  );

  const handleAddToken = useMemoizedFn(async (token: CustomTestnetToken) => {
    await wallet.addCustomTestnetToken(token);
    runCheckIsAdded();
    onAdd?.(token);
  });

  const handleRemoveToken = useMemoizedFn(async (token: CustomTestnetToken) => {
    await wallet.removeCustomTestnetToken(token);
    onRemove?.(token);
    runCheckIsAdded();
  });

  return (
    <Popup
      visible={visible}
      closable={true}
      height={494}
      onClose={onClose}
      className="custom-testnet-token-detail-popup"
      push={false}
    >
      {visible && token && (
        <CustomTestnetTokenDetail
          token={token}
          addToken={handleAddToken}
          removeToken={handleRemoveToken}
          isAdded={isAdded}
          onClose={onClose}
        ></CustomTestnetTokenDetail>
      )}
    </Popup>
  );
};
