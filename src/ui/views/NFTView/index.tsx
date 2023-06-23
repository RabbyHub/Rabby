import React from 'react';
import { useHistory } from 'react-router-dom';
import { PageHeader } from 'ui/component';
import './style.less';
import { CollectionCard } from './CollectionCard';
import { Tabs } from 'antd';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { keyBy, uniq, groupBy } from 'lodash';
import { getChain } from '@/utils';
import { UserCollection } from '@rabby-wallet/rabby-api/dist/types';

export const NFTView: React.FC = () => {
  const history = useHistory();
  const handleClickBack = React.useCallback(() => {
    history.replace('/');
  }, [history]);
  const [tab, setTab] = React.useState('all');
  const { currentAccount } = useRabbySelector((s) => s.account);
  const wallet = useWallet();
  const [isLoading, setIsLoading] = React.useState(false);
  const [list, setList] = React.useState<UserCollection[]>([]);

  const fetchData = React.useCallback(async (id: string) => {
    try {
      setIsLoading(true);

      const data = await wallet.openapi.listNFT(id, false);
      const ids = uniq(data.map((item) => item.collection_id)).filter(
        (item): item is string => !!item
      );
      const collections = await wallet.openapi.listCollection({
        collection_ids: ids.join(','),
      });

      const dict = keyBy(collections, 'id');
      const list = data
        .filter((item) => getChain(item.chain))
        .map((item) => ({
          ...item,
          collection: item.collection_id ? dict[item?.collection_id] : null,
        }))
        .sort((a, b) => {
          if (!a.name) {
            return 1;
          }
          if (!b.name) {
            return -1;
          }
          return a.name > b.name ? 1 : -1;
        });
      const collectionList = Object.values(
        groupBy(list, 'collection_id')
      ).reduce((r, item) => {
        const col = (item as any)[0]?.collection;
        if (col) {
          r.push({
            collection: col,
            list: item,
          });
        }
        return r;
      }, [] as UserCollection[]);

      setList(collectionList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (currentAccount) {
      fetchData(currentAccount.address);
    }
  }, [currentAccount, fetchData]);

  console.log(list);

  return (
    <div className="nft-view px-20 pb-20 bg-[#F0F2F5] min-h-screen">
      <PageHeader onBack={handleClickBack} forceShowBack>
        {'NFT'}
      </PageHeader>
      <div>
        <Tabs defaultActiveKey={tab} centered onChange={setTab}>
          <Tabs.TabPane tab="All" key="all">
            <div className="space-y-12">
              {list.map((item) => (
                <CollectionCard key={item.collection.id} collection={item} />
              ))}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Starred" key="starred">
            <div className="space-y-12">
              {/* <CollectionCard collection={{}} /> */}
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>

      {/* <Modal
        visible={modalVisible}
        centered
        width={336}
        cancelText={null}
        closable={false}
        okText={null}
        footer={null}
        className="nft-modal"
        onCancel={handleToggleModal}
      >
        <NFTModal data={item} />
      </Modal> */}
    </div>
  );
};
