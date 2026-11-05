import { useQueryDbHistory } from '@/db/hooks/history';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { isSupportDBAccount } from '@/utils/account';
import { Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import { Empty } from 'ui/component';
import { DesktopHistoryItem } from './DesktopHistoryItem';
import { DesktopLoading } from './DesktopLoading';

interface TransactionsTabPaneProps {
  scrollContainerRef?: React.RefObject<HTMLElement>;
  selectChainId?: string;
}

export const TransactionsTabPane: React.FC<TransactionsTabPaneProps> = ({
  scrollContainerRef,
  selectChainId,
}) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const isSupportAccount = isSupportDBAccount(currentAccount);

  const [isHideScam, setIsHideScam] = React.useState(isSupportAccount);

  React.useEffect(() => {
    setIsHideScam(isSupportAccount);
  }, [isSupportAccount]);

  const { data, loading, loadingMore, loadMore, noMore } = useQueryDbHistory({
    account: currentAccount,
    isFilterScam: isSupportAccount && isHideScam,
    serverChainId: selectChainId,
  });

  const isEmpty = (data?.length || 0) <= 0 && !loading;

  // Only the local db path keeps 90 days; the api path has no window.
  const noMoreText =
    noMore && !loading && !loadingMore
      ? isSupportAccount
        ? t('page.transactions.noMore.titleInLast90Days')
        : t('page.transactions.noMore.title')
      : undefined;

  return (
    <div className="pb-[16px] px-[20px]">
      {loading ? (
        <div className="overflow-hidden">
          <DesktopLoading count={8} active />
        </div>
      ) : (
        <>
          {isSupportAccount ? (
            <div className="flex items-center justify-end pt-[24px]">
              <label className="flex items-center gap-[6px] cursor-pointer">
                <Switch checked={isHideScam} onChange={setIsHideScam} />
                <div className="text-rb-neutral-title-1 text-[14px] leading-[17px]">
                  {t('page.transactions.hideScamTips')}
                </div>
              </label>
            </div>
          ) : null}
          {isEmpty ? (
            <Empty
              title={
                isSupportAccount
                  ? t('page.transactions.empty.noTxInThreeMonth')
                  : t('page.transactions.empty.title')
              }
              className="pt-[108px]"
            />
          ) : (
            <Virtuoso
              data={data}
              customScrollParent={scrollContainerRef?.current || undefined}
              increaseViewportBy={200}
              itemContent={(_, item) => (
                <DesktopHistoryItem key={item.id} data={item} />
              )}
              endReached={noMore ? undefined : loadMore}
              components={{
                Footer: () => {
                  if (loadingMore) {
                    return <DesktopLoading count={3} active />;
                  }
                  if (noMoreText) {
                    return (
                      <div className="flex items-center gap-[8px] pt-[16px] pb-[4px]">
                        <div className="flex-1 h-[1px] bg-rb-neutral-line" />
                        <div className="text-center text-[13px] leading-[16px] text-rb-neutral-secondary">
                          {noMoreText}
                        </div>
                        <div className="flex-1 h-[1px] bg-rb-neutral-line" />
                      </div>
                    );
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
