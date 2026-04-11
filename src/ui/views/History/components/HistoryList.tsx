import React, { useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryDbHistory } from '@/db/hooks/history';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
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

  const { data, loading } = useQueryDbHistory({
    account: currentAccount,
    isFilterScam,
  });

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
              data={data}
              itemContent={(_, item) => {
                return (
                  <HistoryItem
                    data={item}
                    key={item._id}
                    onViewInputData={setFocusingHistoryItem}
                  />
                );
              }}
              // endReached={loadMore}
              increaseViewportBy={100}
              // components={{
              //   Footer: () => {
              //     if (loadingMore) {
              //       return <Loading count={2} active />;
              //     }
              //     return null;
              //   },
              // }}
            ></Virtuoso>
          )}
        </>
      )}
    </div>
  );
};
