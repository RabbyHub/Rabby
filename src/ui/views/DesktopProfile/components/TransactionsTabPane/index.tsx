import { useQueryDbHistory } from '@/db/hooks/history';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { HistoryItemActionContext } from '@/ui/views/History/components/HistoryItem';
import { Switch } from 'antd';
import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';
import { Empty } from 'ui/component';
import { useWallet } from 'ui/utils';
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
  const wallet = useWallet();
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const [isShowHideScamTxModal, setIsShowHideScamTxModal] = React.useState(
    false
  );
  const [isHideScam, setIsHideScam] = React.useState(true);

  const { data, isLoading } = useQueryDbHistory({
    address: currentAccount?.address || '',
    isFilterScam: isHideScam,
    serverChainId: selectChainId,
  });

  const isEmpty = (data?.length || 0) <= 0 && !isLoading;

  const [
    focusingHistoryItem,
    setFocusingHistoryItem,
  ] = React.useState<HistoryItemActionContext | null>(null);

  return (
    <div className="pb-[16px] px-[20px]">
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

      {isLoading ? (
        <div className="overflow-hidden">
          <DesktopLoading count={8} active />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end pt-[24px]">
            <label className="flex items-center gap-[6px] cursor-pointer">
              <Switch checked={isHideScam} onChange={setIsHideScam} />
              <div className="text-rb-neutral-title-1 text-[14px] leading-[17px]">
                {t('page.transactions.hideScamTips')}
              </div>
            </label>
          </div>
          {isEmpty ? (
            <Empty
              title={t('page.transactions.empty.title')}
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
            />
          )}
        </>
      )}
      {/* <HideScamTransactionModal
        visible={isShowHideScamTxModal}
        onCancel={() => setIsShowHideScamTxModal(false)}
      /> */}
    </div>
  );
};
