import { last } from 'lodash';
import React, { useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type {
  TxAllHistoryResult,
  TxHistoryResult,
} from 'background/service/openapi';

import { useAccount } from '@/ui/store-hooks';
import { useInfiniteScroll } from 'ahooks';
import { Virtuoso } from 'react-virtuoso';
import { Empty, Modal } from 'ui/component';
import { sleep, useWallet } from 'ui/utils';
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

  const buildDisplayData = React.useCallback(
    (result?: TxHistoryResult | TxAllHistoryResult) => {
      if (!result) {
        return {
          last: undefined,
          list: [],
        };
      }
      const tokenDict = (result as any).token_dict;
      const tokenUUIDDict = (result as any).token_uuid_dict;
      const historyList = (result.history_list || []).filter((item) => {
        if (isFilterScam) {
          return !item.is_scam;
        }
        return true;
      });
      const displayList = historyList
        .map((item) => ({
          ...item,
          projectDict: result.project_dict,
          cateDict: result.cate_dict,
          tokenDict,
          tokenUUIDDict,
        }))
        .sort((v1, v2) => v2.time_at - v1.time_at);
      return {
        last: last(displayList)?.time_at,
        list: displayList,
      };
    },
    [isFilterScam]
  );

  const [cachedDisplayData, setCachedDisplayData] = React.useState<ReturnType<
    typeof buildDisplayData
  > | null>(null);

  const fetchData = async (startTime = 0) => {
    const { address } = account!;
    const shouldUseCache = !isFilterScam && startTime === 0;
    let cachedResult: TxHistoryResult | undefined;
    let hasCachedHistory = false;

    if (shouldUseCache) {
      cachedResult = await wallet.getTransactionsCache(address);
      hasCachedHistory = !!cachedResult?.history_list?.length;
    }

    const apiLevel = await wallet.getAPIConfig([], 'ApiLevel', false);
    const apiAvailable = apiLevel < 1;
    let hasNewTx = false;

    if (shouldUseCache && hasCachedHistory && cachedResult) {
      if (!apiAvailable) {
        return buildDisplayData(cachedResult);
      }
      const firstCachedTime = cachedResult.history_list?.[0]?.time_at;
      const { has_new_tx } = await wallet.openapi.hasNewTxFrom({
        address,
        startTime: firstCachedTime,
      });
      hasNewTx = has_new_tx;
      if (!hasNewTx) {
        return buildDisplayData(cachedResult);
      }
    }

    if (!hasCachedHistory) {
      hasNewTx = true;
    }

    if (!apiAvailable) {
      return {
        list: [],
      };
    }

    if (startTime) {
      await sleep(500);
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
    if (startTime === 0 && hasNewTx && !isFilterScam) {
      await wallet.updateTransactionsCache(address, res as TxHistoryResult);
    }

    return buildDisplayData(res);
  };

  const { data, loading, loadingMore, loadMore, mutate } = useInfiniteScroll(
    (d) => fetchData(d?.last),
    {
      isNoMore: (d) => {
        return isFilterScam
          ? true
          : !d?.last || (d?.list.length || 0) < PAGE_COUNT;
      },
    }
  );

  React.useEffect(() => {
    let cancelled = false;
    if (!account || isFilterScam) {
      setCachedDisplayData(null);
      return;
    }
    (async () => {
      const cached = await wallet.getTransactionsCache(account.address);
      if (cancelled) {
        return;
      }
      if (cached?.history_list?.length) {
        const displayData = buildDisplayData(cached);
        setCachedDisplayData(displayData);
        mutate(displayData);
      } else {
        setCachedDisplayData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account?.address, isFilterScam, buildDisplayData, wallet, mutate]);

  const renderData = data || cachedDisplayData;
  const listData = renderData?.list || [];
  const showInitialLoading = loading && listData.length <= 0;
  const isEmpty = listData.length <= 0 && !showInitialLoading;

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

      {showInitialLoading ? (
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
              data={listData}
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
              increaseViewportBy={100}
              components={{
                Footer: () => {
                  if (loadingMore) {
                    return <Loading count={2} active />;
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
