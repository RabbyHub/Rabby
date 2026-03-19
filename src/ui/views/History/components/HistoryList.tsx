import { last, sortBy } from 'lodash';
import React, { useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type {
  TxAllHistoryResult,
  TxHistoryResult,
} from 'background/service/openapi';

import { useAccount } from '@/ui/store-hooks';
import { useInfiniteScroll, useRequest } from 'ahooks';
import { Virtuoso } from 'react-virtuoso';
import { Empty, Modal } from 'ui/component';
import { sleep, useWallet } from 'ui/utils';
import { HistoryItem, HistoryItemActionContext } from './HistoryItem';
import { Loading } from './Loading';
import { useLiveQuery } from 'dexie-react-hooks';
import { historyDbService } from '@/db/services/historyDbService';
import { useMount } from 'react-use';
import { db } from '@/db';
import { useQueryDbHistory } from '@/db/hooks/history';

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

  const { data, isLoading } = useQueryDbHistory({
    address: account?.address || '',
    isFilterScam,
  });

  const isEmpty = !data || data.length === 0;

  const showInitialLoading = isLoading && isEmpty;

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
