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
              title={t('page.transactions.empty.noTxInThreeMonth')}
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
