import React from 'react';
import { useHistory } from 'react-router-dom';
import { PageHeader } from 'ui/component';
import './style.less';
import { CollectionCard } from './CollectionCard';
import { Modal, Tabs } from 'antd';
import { NFTItem } from '@rabby-wallet/rabby-api/dist/types';
import NFTModal from '../Dashboard/components/NFT/NFTModal';
import { CollectionListSkeleton } from './CollectionListSkeleton';
import { useCollection } from './useCollection';
import { NFTListEmpty, NFTStarredListEmpty } from './NFTEmpty';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import styles from './index.module.css';

export const NFTView: React.FC<{
  isInModal?: boolean;
}> = ({ isInModal }) => {
  const history = useHistory();
  const handleClickBack = React.useCallback(() => {
    history.replace('/');
  }, [history]);
  const [tab, setTab] = React.useState('all');
  const [nftItem, setNFTItem] = React.useState<NFTItem | null>(null);
  const [collectionName, setCollectionName] = React.useState<string>();
  const [modalVisible, setModalVisible] = React.useState(false);
  const {
    isLoading,
    list,
    starredList,
    onToggleStar,
    checkStarred,
  } = useCollection();
  const { t } = useTranslation();
  const handleShowModal = React.useCallback((item: NFTItem, name: string) => {
    setCollectionName(name);
    setNFTItem(item);
    setModalVisible(true);
  }, []);

  const handleHideModal = React.useCallback(() => {
    setModalVisible(false);
    setNFTItem(null);
  }, []);

  return (
    <div
      className={clsx(
        'nft-view px-20 pb-20 bg-r-neutral-bg-2 h-screen',
        isInModal ? 'is-in-modal' : ''
      )}
    >
      {isInModal ? (
        <div className="text-center text-r-neutral-title1 text-[20px] leading-[24px] font-medium py-[16px]">
          {t('page.nft.title')}
        </div>
      ) : (
        <PageHeader onBack={handleClickBack} forceShowBack>
          {t('page.nft.title')}
        </PageHeader>
      )}
      <div>
        <Tabs
          className={styles.tabs}
          defaultActiveKey={tab}
          centered
          onChange={setTab}
        >
          <Tabs.TabPane tab={t('page.nft.all')} key="all">
            {isLoading ? (
              <CollectionListSkeleton />
            ) : list.length ? (
              <div className="space-y-12 pb-12">
                {list.map((item) => (
                  <CollectionCard
                    key={`${item.id}${item.chain}`}
                    collection={item}
                    onClickNFT={handleShowModal}
                    isStarred={checkStarred(item)}
                    onStar={() => onToggleStar(item)}
                  />
                ))}
              </div>
            ) : (
              <NFTListEmpty />
            )}
          </Tabs.TabPane>
          <Tabs.TabPane
            tab={t('page.nft.starred', {
              count: starredList.length,
            })}
            key="starred"
          >
            {isLoading ? (
              <CollectionListSkeleton />
            ) : starredList.length ? (
              <div className="space-y-12 pb-12">
                {starredList.map((item) => (
                  <CollectionCard
                    key={item.id}
                    collection={item}
                    onClickNFT={handleShowModal}
                    isStarred
                    onStar={() => onToggleStar(item)}
                  />
                ))}
              </div>
            ) : (
              <NFTStarredListEmpty />
            )}
          </Tabs.TabPane>
        </Tabs>
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
        maskStyle={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
        onCancel={handleHideModal}
      >
        {nftItem && (
          <NFTModal
            data={nftItem}
            collectionName={collectionName}
            onClose={handleHideModal}
          />
        )}
      </Modal>
    </div>
  );
};
