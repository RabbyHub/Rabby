import { UserCollection, NFTItem } from '@/background/service/openapi';
import React, { useState } from 'react';
import { Modal } from 'antd';
import ChainIcon from './ChainIcon';
import NFTAvatar from './NFTAvatar';
import NFTModal from './NFTModal';
import { matomoRequestEvent } from '@/utils/matomo-request';
import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { useAccount } from '@/ui/store-hooks';

export interface CollectionCardProps {
  data: UserCollection[];
  index: number;
  style?: React.CSSProperties;
  onChange?: (id: string, v: boolean) => void;
  expaned?: boolean;
}
const CollectionCard = (props: CollectionCardProps) => {
  const { data, index } = props;
  const { collection, list } = data[index];
  const [nftItem, setNFTItem] = useState<NFTItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentAccount] = useAccount();

  const handleHideModal = () => {
    setModalVisible(false);
    setNFTItem(null);
  };

  const handleShowModal = (item: NFTItem) => {
    setNFTItem(item);
    setModalVisible(true);
    matomoRequestEvent({
      category: 'ViewAssets',
      action: 'viewNFTDetail',
      label: [
        getKRCategoryByType(currentAccount?.type),
        currentAccount?.brandName,
        item?.collection ? 'true' : 'false',
      ].join('|'),
    });
  };

  return (
    <div className={'collection-card'}>
      <div className="collection-card-header">
        <div className="collection-card-title">{collection.name}</div>
        <div className="collection-card-count">({list.length})</div>
        <div className="collection-card-chain">
          {list[0].chain && <ChainIcon chain={list[0].chain}></ChainIcon>}
        </div>
      </div>
      <div className="collection-card-body">
        {list.map((item) => {
          return (
            <NFTAvatar
              onPreview={() => handleShowModal(item)}
              type={item.content_type}
              amount={item.amount}
              content={item.content}
              key={item.id}
            />
          );
        })}
      </div>
      <Modal
        visible={modalVisible}
        centered
        width={336}
        cancelText={null}
        closable={false}
        okText={null}
        footer={null}
        className="nft-modal"
        onCancel={handleHideModal}
      >
        {nftItem && <NFTModal data={nftItem} />}
      </Modal>
    </div>
  );
};

export default CollectionCard;
