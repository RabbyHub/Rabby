import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from 'ui/utils/token';
import clsx from 'clsx';
import React from 'react';
import NFTModal from '@/ui/views/Dashboard/components/NFT/NFTModal';
import { Modal } from 'antd';

export interface Props {
  token: TokenItem;
  isNft?: boolean;
  canClickToken?: boolean;
  onClose?: () => void;
}

export const TokenLabel: React.FC<Props> = ({
  token,
  isNft,
  canClickToken = true,
  onClose,
}) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <span
        onClick={() => {
          if (!canClickToken) return;
          setVisible(true);
        }}
        className={clsx('ml-2', {
          'underline cursor-pointer': canClickToken,
        })}
      >
        {getTokenSymbol(token)}
      </span>
      {isNft ? (
        <Modal
          visible={visible}
          centered
          width={336}
          cancelText={null}
          closable={false}
          okText={null}
          footer={null}
          className="nft-modal"
          maskStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
          onCancel={() => setVisible(false)}
        >
          <NFTModal
            onClose={() => {
              setVisible(false);
              onClose?.();
            }}
            data={token as any}
          />
        </Modal>
      ) : (
        <TokenDetailPopup
          variant="add"
          visible={visible}
          onClose={() => {
            setVisible(false);
            onClose?.();
          }}
          token={token}
        />
      )}
    </>
  );
};
