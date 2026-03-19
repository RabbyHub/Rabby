import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useInfiniteScroll } from 'ahooks';
import { Empty, Modal } from 'ui/component';
import { sleep, useWallet } from 'ui/utils';
import {
  HistoryItem,
  HistoryItemActionContext,
} from '@/ui/views/History/components/HistoryItem';
import { Loading } from '@/ui/views/History/components/Loading';
import { DesktopLoading } from './DesktopLoading';
import { last } from 'lodash';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DesktopHistoryItem } from './DesktopHistoryItem';
import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import clsx from 'clsx';
import { HideScamTransactionModal } from './HideScamTransactionModal';
import { useQueryDbHistory } from '@/db/hooks/history';

const PAGE_COUNT = 20;

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
  const { data, isLoading } = useQueryDbHistory({
    address: currentAccount?.address || '',
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
          <div
            className={clsx(
              'mt-[12px] mb-[10px]',
              'inline-flex items-center gap-[4px] rounded-[8px] py-[6px] px-[8px] bg-rb-neutral-bg-3',
              'text-[14px] leading-[18px] font-medium text-rb-neutral-foot',
              'hover:bg-rb-brand-light-1 hover:text-rb-brand-default',
              'cursor-pointer'
            )}
            onClick={() => {
              setIsShowHideScamTxModal(true);
            }}
          >
            {t('page.transactions.filterScam.button')}
            <RcIconArrowRightCC />
          </div>
          {isEmpty ? (
            <Empty
              title={t('page.transactions.empty.title')}
              className="pt-[108px]"
            />
          ) : (
            <div className="overflow-hidden">
              {data?.map((item) => (
                <DesktopHistoryItem key={item.id} data={item} />
              ))}
              {/* {loadingMore && <DesktopLoading count={3} active />} */}
            </div>
          )}
        </>
      )}
      <HideScamTransactionModal
        visible={isShowHideScamTxModal}
        onCancel={() => setIsShowHideScamTxModal(false)}
      />
    </div>
  );
};
