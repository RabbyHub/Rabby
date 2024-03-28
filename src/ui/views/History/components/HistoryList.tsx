import { last } from 'lodash';
import React, { useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAccount } from '@/ui/store-hooks';
import { useInfiniteScroll } from 'ahooks';
import { Virtuoso } from 'react-virtuoso';
import { Empty, Modal } from 'ui/component';
import { useWallet } from 'ui/utils';
import { HistoryItem, HistoryItemActionContext } from './HistoryItem';
import { Loading } from './Loading';

const PAGE_COUNT = 10;

export const HistoryList = ({
  isFilterScam = false,
}: {
  isFilterScam?: boolean;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const ref = useRef<HTMLDivElement | null>(null);
  const [account] = useAccount();

  const getAllTxHistory = (
    params: Parameters<typeof wallet.openapi.getAllTxHistory>[0]
  ) => {
    const getHistory = wallet.openapi.getAllTxHistory;

    return getHistory(params).then((res) => {
      if (res.history_list) {
        res.history_list = res.history_list.filter((item) => {
          return !item.is_scam;
        });
      }
      return res;
    });
  };

  const fetchData = async (startTime = 0) => {
    const { address } = account!;
    const apiLevel = await wallet.getAPIConfig([], 'ApiLevel', false);
    if (apiLevel >= 1) {
      return {
        list: [],
      };
    }
    const getHistory = wallet.openapi.listTxHisotry;

    const res = isFilterScam
      ? await getAllTxHistory({
          id: address,
        })
      : await getHistory({
          id: address,
          start_time: startTime,
          page_count: PAGE_COUNT,
        });

    const { project_dict, cate_dict, history_list: list } = res;
    const displayList = list
      .map((item) => ({
        ...item,
        projectDict: project_dict,
        cateDict: cate_dict,
        tokenDict: 'token_dict' in res ? res.token_dict : undefined,
        tokenUUIDDict:
          'token_uuid_dict' in res ? res.token_uuid_dict : undefined,
      }))
      .sort((v1, v2) => v2.time_at - v1.time_at);
    return {
      last: last(displayList)?.time_at,
      list: displayList,
    };
  };

  const { data, loading, loadingMore, loadMore } = useInfiniteScroll(
    (d) => fetchData(d?.last),
    {
      isNoMore: (d) => {
        return isFilterScam
          ? true
          : !d?.last || (d?.list.length || 0) < PAGE_COUNT;
      },
    }
  );

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  const [
    focusingHistoryItem,
    setFocusingHistoryItem,
  ] = React.useState<HistoryItemActionContext | null>(null);

  return (
    <div className="overflow-auto h-full" ref={ref}>
      <Modal
        visible={!!focusingHistoryItem}
        // View Message
        title={t('page.transactions.modalViewMessage.title')}
        className="view-tx-message-modal"
        onCancel={() => {
          setFocusingHistoryItem(null);
        }}
        maxHeight="360px"
      >
        <div className="parsed-content text-14">
          {focusingHistoryItem?.parsedInputData}
        </div>
      </Modal>

      {loading ? (
        <div className={isFilterScam ? 'pt-[20px]' : ''}>
          {isFilterScam ? (
            <div className="filter-scam-loading-text">
              {t('page.transactions.filterScam.loading')}
            </div>
          ) : null}
          <Loading count={4} active />
        </div>
      ) : (
        <>
          {isEmpty ? (
            <Empty
              title={t('page.transactions.empty.title')}
              desc={
                <span>
                  <Trans i18nKey="page.transactions.empty.desc" t={t}>
                    No transactions found on
                    <Link className="underline" to="/settings/chain-list">
                      supported chains
                    </Link>
                  </Trans>
                </span>
              }
              className="pt-[108px]"
            ></Empty>
          ) : (
            <Virtuoso
              style={{
                height: '100%',
              }}
              data={data?.list || []}
              itemContent={(_, item) => {
                return (
                  <HistoryItem
                    data={item}
                    projectDict={item.projectDict}
                    cateDict={item.cateDict}
                    tokenDict={item.tokenDict || item.tokenUUIDDict || {}}
                    key={item.id}
                    onViewInputData={setFocusingHistoryItem}
                  />
                );
              }}
              endReached={loadMore}
              components={{
                Footer: () => {
                  if (loadingMore) {
                    return <Loading count={4} active />;
                  }
                  return null;
                },
              }}
            ></Virtuoso>
          )}
        </>
      )}
    </div>
  );
};
