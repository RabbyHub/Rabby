import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryDbHistory } from '@/db/hooks/history';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { BridgeHistoryCard } from '@/ui/views/Bridge/Component/BridgeHistory';
import { useBridgeHistoryByTxIds } from '@/ui/views/History/hooks/useBridgeHistoryByTxIds';
import { mergeHistoryWithBridge } from '@/ui/views/History/utils/mergeBridgeHistory';
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
    enabled: hasLocalHistory,
    address,
    items: data || [],
  });
  const rows = useMemo(
    () =>
      hasLocalHistory
        ? mergeHistoryWithBridge(data || [], bridges)
        : (data || []).map((item) => ({
            kind: 'tx' as const,
            key: item._id,
            item,
          })),
    [bridges, data, hasLocalHistory]
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [locals, setLocals] = useState<BridgeTxHistoryItem[]>([]);

  useEffect(() => {
    if (!hasLocalHistory || !address) return;
    wallet.getBridgeTxHistory(address).then((list) => {
      setLocals(list || []);
    });
  }, [address, hasLocalHistory, wallet]);

  const isEmpty = !data || data.length === 0;

  const showInitialLoading = loading && isEmpty;

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
                  <Trans
                    i18nKey="page.transactions.empty.descThreeMonths"
                    t={t}
                  >
                    No Transaction history in 90 Days on{' '}
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
              data={rows}
              rangeChanged={
                hasLocalHistory
                  ? (range) =>
                      onRangeChanged(
                        range.startIndex,
                        range.endIndex,
                        rowsRef.current
                      )
                  : undefined
              }
              itemContent={(_, row) => {
                if (row.kind === 'bridge') {
                  const fromId = row.item.from_tx?.tx_id?.toLowerCase();
                  const local = locals.find(
                    (item) =>
                      item.hash?.toLowerCase() === fromId ||
                      item.acceleratedHash?.toLowerCase() === fromId
                  );
                  return (
                    <div className="mb-12">
                      <BridgeHistoryCard
                        data={row.item}
                        local={local}
                        variant="general"
                      />
                    </div>
                  );
                }
                return (
                  <HistoryItem
                    data={row.item}
                    key={row.key}
                    onViewInputData={setFocusingHistoryItem}
                  />
                );
              }}
              endReached={noMore ? undefined : loadMore}
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
