import React from 'react';
import { useHistory } from 'react-router-dom';
import { PageHeader } from 'ui/component';
import './style.less';
import { CollectionCard } from './CollectionCard';
import { Modal, Tabs } from 'antd';
import { useRabbySelector } from '@/ui/store';
import { NFTItem } from '@rabby-wallet/rabby-api/dist/types';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import NFTModal from '../Dashboard/components/NFT/NFTModal';
import { CollectionListSkeleton } from './CollectionListSkeleton';
import styled from 'styled-components';
import { useCollection } from './useCollection';
import { NFTListEmpty, NFTStarredListEmpty } from './NFTEmpty';
import { useTranslation } from 'react-i18next';

const TabsStyled = styled(Tabs)`
  .ant-tabs-tab {
    border-radius: 4px;
    color: var(--r-neutral-body, #3e495e);
    font-size: 12px;
    transition: all 0.3s ease-in-out;
    margin: 0 !important;
    width: 100px;
    height: 28px;
    font-weight: 500;
    padding: 0;
    text-align: center;

    &.ant-tabs-tab-active {
      background: var(--r-neutral-card-1, #fff);
      color: var(--r-blue-default, #7084ff);
    }

    &:hover {
      color: var(--r-blue-default, #7084ff);
    }
  }

  .ant-tabs-tab-btn {
    margin: auto;
  }

  &.ant-tabs-top > .ant-tabs-nav::before {
    border-bottom-color: transparent;
  }

  .ant-tabs-nav-list {
    margin: auto;
    background: var(--r-neutral-line, #d3d8e0);
    border-radius: 6px;
    padding: 2px;
  }

  .ant-tabs-ink-bar {
    display: none;
  }

  .ant-tabs-tabpane {
    height: calc(100vh - 100px);
    overflow: auto;
  }
`;

export const NFTView: React.FC = () => {
  const history = useHistory();
  const handleClickBack = React.useCallback(() => {
    history.replace('/');
  }, [history]);
  const [tab, setTab] = React.useState('all');
  const { currentAccount } = useRabbySelector((s) => s.account);
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
    matomoRequestEvent({
      category: 'ViewAssets',
      action: 'viewNFTDetail',
      label: [
        getKRCategoryByType(currentAccount?.type),
        currentAccount?.brandName,
        item?.collection ? 'true' : 'false',
      ].join('|'),
    });
  }, []);

  const handleHideModal = React.useCallback(() => {
    setModalVisible(false);
    setNFTItem(null);
  }, []);

  return (
    <div className="nft-view px-20 pb-20 bg-r-neutral-bg-2 h-screen">
      <PageHeader onBack={handleClickBack} forceShowBack>
        {t('page.nft.title')}
      </PageHeader>
      <div>
        <TabsStyled defaultActiveKey={tab} centered onChange={setTab}>
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
        </TabsStyled>
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
        {nftItem && <NFTModal data={nftItem} collectionName={collectionName} />}
      </Modal>
    </div>
  );
};
