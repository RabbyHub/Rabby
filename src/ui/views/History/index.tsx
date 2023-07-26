import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { last } from 'lodash';
import { Tabs } from 'antd';

import { connectStore } from '@/ui/store';
import { useAccount } from '@/ui/store-hooks';
import { useInfiniteScroll } from 'ahooks';
import { TxHistoryResult } from 'background/service/openapi';
import { Empty, PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { HistoryItem } from './HistoryItem';
import { Loading } from './Loading';
import './style.less';
import NetSwitchTabs, {
  useSwitchNetTab,
} from '@/ui/component/PillsSwitch/NetSwitchTabs';

const PAGE_COUNT = 10;

const Null = () => null;

const HistoryList = ({ isMainnet = true }: { isMainnet?: boolean }) => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const ref = useRef<HTMLDivElement | null>(null);
  const [account] = useAccount();

  const fetchData = async (startTime = 0) => {
    const { address } = account!;
    const getHistory = isMainnet
      ? wallet.openapi.listTxHisotry
      : wallet.testnetOpenapi.listTxHisotry;

    const res: TxHistoryResult = await getHistory({
      id: address,
      start_time: startTime,
      page_count: PAGE_COUNT,
    });
    const { project_dict, cate_dict, token_dict, history_list: list } = res;
    const displayList = list
      .map((item) => ({
        ...item,
        projectDict: project_dict,
        cateDict: cate_dict,
        tokenDict: token_dict,
      }))
      .sort((v1, v2) => v2.time_at - v1.time_at);
    return {
      last: last(displayList)?.time_at,
      list: displayList,
    };
  };

  const { data, loading, loadingMore } = useInfiniteScroll(
    (d) => fetchData(d?.last),
    {
      target: ref,
      isNoMore: (d) => {
        return !d?.last || (d?.list.length || 0) < PAGE_COUNT;
      },
    }
  );

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  return (
    <div className="overflow-auto h-full" ref={ref}>
      {data?.list.map((item) => (
        <HistoryItem
          data={item}
          projectDict={item.projectDict}
          cateDict={item.cateDict}
          tokenDict={item.tokenDict}
          key={item.id}
        ></HistoryItem>
      ))}
      {(loadingMore || loading) && <Loading count={5} active />}
      {isEmpty && (
        <Empty
          title={t('No transactions')}
          desc={
            <span>
              No transactions found on{' '}
              <Link className="underline" to="/settings/chain-list">
                {t('supported chains')}
              </Link>
            </span>
          }
          className="pt-[108px]"
        ></Empty>
      )}
    </div>
  );
};

const History = () => {
  const { t } = useTranslation();
  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();
  const renderTabBar = React.useCallback(() => <Null />, []);

  return (
    <div className="txs-history">
      <PageHeader fixed>{t('Transactions')}</PageHeader>
      {isShowTestnet && (
        <NetSwitchTabs
          value={selectedTab}
          onTabChange={onTabChange}
          className="h-[28px] box-content mt-[20px] mb-[20px]"
        />
      )}
      <Tabs
        className="h-full"
        renderTabBar={renderTabBar}
        activeKey={selectedTab}
      >
        <Tabs.TabPane key="mainnet" destroyInactiveTabPane={false}>
          <HistoryList isMainnet />
        </Tabs.TabPane>
        <Tabs.TabPane key="testnet">
          <HistoryList isMainnet={false} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default connectStore()(History);
