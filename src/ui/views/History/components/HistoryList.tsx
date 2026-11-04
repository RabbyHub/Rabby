import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryDbHistory } from '@/db/hooks/history';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { BridgeHistoryCard } from '@/ui/views/Bridge/Component/BridgeHistory';
import { useBridgeHistoryByTxIds } from '@/ui/views/History/hooks/useBridgeHistoryByTxIds';
import { mergeHistoryWithBridge } from '@/ui/views/History/utils/mergeBridgeHistory';
import { bridgeHistoryStatusKey } from '@/ui/views/Bridge/utils/historyRefresh';
import { isSupportDBAccount } from '@/utils/account';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { useWallet } from '@/ui/utils';
import { Virtuoso } from 'react-virtuoso';
import { Empty, Modal } from 'ui/component';
import { HistoryItem, HistoryItemActionContext } from './HistoryItem';
import { Loading } from './Loading';

export const HistoryList = ({
  isFilterScam = false,
}: {
  isFilterScam?: boolean;
}) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const hasLocalHistory = isSupportDBAccount(currentAccount);
  const address = currentAccount?.address || '';

  const { data, loading, loadingMore, loadMore, noMore } = useQueryDbHistory({
    account: currentAccount,
    isFilterScam,
  });
  const { bridges, onRangeChanged } = useBridgeHistoryByTxIds({
    enabled: !!address,
    pollingEnabled: hasLocalHistory,
    address,
    items: data || [],
  });
  const rows = useMemo(() => mergeHistoryWithBridge(data || [], bridges), [
    bridges,
    data,
  ]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [locals, setLocals] = useState<BridgeTxHistoryItem[]>([]);
  const statusKey = useMemo(() => bridgeHistoryStatusKey(bridges), [bridges]);

  useEffect(() => {
    let disposed = false;
    if (!hasLocalHistory || !address) {
      setLocals([]);
      return;
    }
    wallet.getBridgeTxHistory(address).then((list) => {
      if (!disposed) setLocals(list || []);
    });
    return () => {
      disposed = true;
    };
  }, [address, hasLocalHistory, wallet, statusKey]);

  const isEmpty = !data || data.length === 0;

  const showInitialLoading = loading && isEmpty;

  // Only the local db path keeps 90 days; the api path has no window.
  // Wait for loading to settle so a running sync doesn't show it early.
  const noMoreText =
    noMore && !loading && !loadingMore
      ? hasLocalHistory
        ? t('page.transactions.noMore.titleInLast90Days')
        : t('page.transactions.noMore.title')
      : undefined;

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
        <div>
          {/* {isFilterScam ? (
            <div className="filter-scam-loading-text">
              {t('page.transactions.filterScam.loading')}
            </div>
          ) : null} */}
          <Loading count={4} active />
        </div>
      ) : (
        <>
          {isEmpty ? (
            <Empty
              title={t('page.transactions.empty.title')}
              desc={
                <span>
                  {hasLocalHistory ? (
                    <Trans
                      i18nKey="page.transactions.empty.descThreeMonths"
                      t={t}
                    >
                      No Transaction history in 90 Days on{' '}
                      <Link className="underline" to="/settings/chain-list">
                        supported chains
                      </Link>
                    </Trans>
                  ) : (
                    <Trans i18nKey="page.transactions.empty.desc" t={t}>
                      No transactions found on
                      <Link className="underline" to="/settings/chain-list">
                        supported chains
                      </Link>
                    </Trans>
                  )}
                </span>
              }
              className="pt-[108px]"
            ></Empty>
          ) : (
            <Virtuoso
              style={{
                height: '100%',
              }}
              data={rows}
              computeItemKey={(_, row) => row.key}
              rangeChanged={(range) =>
                onRangeChanged(
                  range.startIndex,
                  range.endIndex,
                  rowsRef.current
                )
              }
              // Virtuoso sizes rows by offsetHeight, which leaves out margins.
              // Keep the 12px row gap inside each row (padding, or flow-root
              // for the card's own margin) so the measured height matches the
              // layout; otherwise the list jumps by 12px at the bottom.
              itemContent={(_, row) => {
                if (row.kind === 'bridge') {
                  const fromId = row.item.from_tx?.tx_id?.toLowerCase();
                  const local = locals.find(
                    (item) =>
                      item.hash?.toLowerCase() === fromId ||
                      item.acceleratedHash?.toLowerCase() === fromId
                  );
                  return (
                    <div className="pb-12">
                      <BridgeHistoryCard
                        data={row.item}
                        local={local}
                        variant="general"
                        displayTime={row.displayTime}
                      />
                    </div>
                  );
                }
                return (
                  <div className="flow-root">
                    <HistoryItem
                      data={row.item}
                      key={row.key}
                      onViewInputData={setFocusingHistoryItem}
                    />
                  </div>
                );
              }}
              endReached={noMore ? undefined : loadMore}
              increaseViewportBy={100}
              components={{
                Footer: () => {
                  if (loadingMore) {
                    return <Loading count={2} active />;
                  }
                  if (noMoreText) {
                    return (
                      <div className="flex items-center gap-[8px] pt-[4px] pb-[20px]">
                        <div className="flex-1 h-[1px] bg-r-neutral-line" />
                        <div className="text-center text-[12px] leading-[14px] text-r-neutral-foot">
                          {noMoreText}
                        </div>
                        <div className="flex-1 h-[1px] bg-r-neutral-line" />
                      </div>
                    );
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
