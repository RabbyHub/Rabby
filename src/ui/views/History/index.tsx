import { useInfiniteScroll } from 'ahooks';
import { TxHistoryResult } from 'background/service/openapi';
import { last } from 'lodash';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { HistoryItem } from './HistoryItem';
import { Loading } from './Loading';
import './style.less';

const PAGE_COUNT = 100;

const History = () => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const ref = useRef<HTMLDivElement | null>(null);

  const fetchData = async (startTime = 0) => {
    const { address } = await wallet.syncGetCurrentAccount()!;

    const res: TxHistoryResult = await wallet.openapi.listTxHisotry({
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
        return !d?.list.length || (d?.list.length || 0) % PAGE_COUNT != 0;
      },
    }
  );

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  return (
    <div className="txs-history" ref={ref}>
      <PageHeader>{t('Transactions')}</PageHeader>
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
        <div className="txs-history__empty">
          <img className="no-data" src="./images/nodata-tx.png" />
          <p className="text-14 text-gray-content mt-12">
            {t('No Transactions')}
          </p>
        </div>
      )}
    </div>
  );
};

export default History;
