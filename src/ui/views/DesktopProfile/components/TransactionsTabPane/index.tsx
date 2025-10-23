import React, { useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAccount } from '@/ui/store-hooks';
import { useInfiniteScroll } from 'ahooks';
import { Virtuoso } from 'react-virtuoso';
import { Empty, Modal } from 'ui/component';
import { sleep, useWallet } from 'ui/utils';
import {
  HistoryItem,
  HistoryItemActionContext,
} from '@/ui/views/History/components/HistoryItem';
import { Loading } from '@/ui/views/History/components/Loading';
import { last } from 'lodash';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DesktopHistoryItem } from './DesktopHistoryItem';

const PAGE_COUNT = 10;

export const TransactionsTabPane = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const currentAccount = useCurrentAccount();

  const fetchData = async (startTime = 0) => {
    const { address } = currentAccount!;
    if (startTime) {
      await sleep(500);
    }
    const apiLevel = await wallet.getAPIConfig([], 'ApiLevel', false);
    if (apiLevel >= 1) {
      return {
        list: [],
      };
    }
    const getHistory = wallet.openapi.listTxHisotry;

    const res = await getHistory({
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
        return !d?.last || (d?.list.length || 0) < PAGE_COUNT;
      },
    }
  );

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  const [
    focusingHistoryItem,
    setFocusingHistoryItem,
  ] = React.useState<HistoryItemActionContext | null>(null);

  return (
    <div className="h-full">
      {/* <Modal
        visible={!!focusingHistoryItem}
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
      </Modal> */}

      {loading ? (
        <div className="pt-[20px]">
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
            />
          ) : (
            <Virtuoso
              style={{
                height: '500px',
              }}
              data={data?.list || []}
              itemContent={(_, item) => {
                return (
                  <DesktopHistoryItem
                    data={item}
                    projectDict={item.projectDict}
                    cateDict={item.cateDict}
                    tokenDict={item.tokenDict || item.tokenUUIDDict || {}}
                    key={item.id}
                  />
                );
              }}
              endReached={loadMore}
              increaseViewportBy={100}
              components={{
                Footer: () => {
                  if (loadingMore) {
                    return <Loading count={2} active />;
                  }
                  return null;
                },
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
