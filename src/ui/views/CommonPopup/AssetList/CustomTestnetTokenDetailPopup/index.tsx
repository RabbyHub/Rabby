import { CustomTestnetToken } from '@/background/service/customTestnet';
import { Popup } from '@/ui/component';
import { isSameAddress, useWallet } from '@/ui/utils';
import React from 'react';
import { useRabbyDispatch } from 'ui/store';
import './style.less';
import { CustomTestnetTokenDetail } from './CustomTestnetTokenDetail';

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
  isAdded,
  onAdd,
  onRemove,
}: TokenDetailProps) => {
  const wallet = useWallet();

  const handleAddToken = React.useCallback(
    async (token: CustomTestnetToken) => {
      await wallet.addCustomTestnetToken(token);
      onAdd?.(token);
    },
    []
  );

  const handleRemoveToken = React.useCallback(
    async (token: CustomTestnetToken) => {
      await wallet.removeCustomTestnetToken(token);
      onRemove?.(token);
    },
    []
  );

  // const checkIsAdded = React.useCallback(async () => {
  //   if (!token) return;
  //   const account = await wallet.getCurrentAccount();

  //   const list = await wallet.getCustomTestnetTokenList({
  //     address: account!.address,
  //   });

  //   const isAdded = list.some(
  //     (item) =>
  //       isSameAddress(item.id, token.id) && item.chainId === token.chainId
  //   );
  //   setIsAdded(isAdded);
  // }, [token]);

  // React.useEffect(() => {
  //   checkIsAdded();
  // }, [checkIsAdded]);

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
