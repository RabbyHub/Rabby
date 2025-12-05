import React, { useEffect, useMemo, useState } from 'react';
import { Popup } from '@/ui/component';
import { useTranslation } from 'react-i18next';
import { Button, DrawerProps } from 'antd';
import { DEX, EVENTS } from '@/constant';
import { SvgIconCross } from '@/ui/assets';
import { TransactionGroup } from '@/background/service/transactionHistory';
import eventBus from '@/eventBus';
import { useLoadTxRequests } from '../../TransactionHistory/hooks';
import { useMemoizedFn } from 'ahooks';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { findChainByID } from '@/utils/chain';
import { Account } from '@/background/service/preference';
import { minBy } from 'lodash';
import { TransactionItem } from '../../TransactionHistory/components/TransactionItem';

export const PendingTxStatusPopup = ({
  visible,
  onClose,
  getContainer,
  type,
  txHash,
  chainId,
}: {
  visible: boolean;
  onClose: () => void;
  type: 'swap' | 'send';
  chainId: number;
  txHash: string;
  getContainer?: DrawerProps['getContainer'];
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const account = useCurrentAccount();
  const [_pendingList, setPendingList] = useState<TransactionGroup[]>([]);
  const [_completeList, setCompleteList] = useState<TransactionGroup[]>([]);

  const pendingList = useMemo(() => {
    return _pendingList.filter((item) => findChainByID(item?.chainId));
  }, [_pendingList]);

  const completeList = useMemo(() => {
    return _completeList.filter((item) => findChainByID(item?.chainId));
  }, [_completeList]);

  const selectedList = useMemo(() => {
    return [...pendingList, ...completeList].filter(
      (item) =>
        item.chainId === chainId && item.txs.some((tx) => tx.hash === txHash)
    );
  }, [pendingList, completeList, txHash, chainId]);


  
  const init = async () => {
    if (!account) {
      return;
    }
    const { pendings, completeds } = await wallet.getTransactionHistory(
      account.address
    );
    setPendingList(pendings);
    setCompleteList(completeds);
  };

  const loadPendingListQueue = async () => {
    const account = await wallet.syncGetCurrentAccount<Account>()!;
    await wallet.loadPendingListQueue(account.address);
  };

  const handleTxComplete = () => {
    init();
    loadPendingListQueue();
  };

  useEffect(() => {
    init();
    loadPendingListQueue();
  }, [account?.address]);

  const { txRequests, reloadTxRequests } = useLoadTxRequests(pendingList);

  const handleReload = useMemoizedFn((params: { addressList: string[] }) => {
    if (
      account?.address &&
      params?.addressList?.find((item) => {
        return isSameAddress(item || '', account?.address || '');
      })
    ) {
      init();
      reloadTxRequests();
    }
  });

  useEffect(() => {
    eventBus.addEventListener(EVENTS.RELOAD_TX, handleReload);
    return () => {
      eventBus.removeEventListener(EVENTS.RELOAD_TX, handleReload);
    };
  }, [handleReload]);

  return (
    <Popup
      placement="bottom"
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-r-neutral-foot pt-[2px]" />
      }
      visible={visible}
      closable={true}
      title={null}
      isSupportDarkMode
      isNew
      contentWrapperStyle={{
        height: 'auto',
      }}
      onCancel={onClose}
      destroyOnClose
      bodyStyle={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--r-neutral-bg2, #F2F4F7)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
      }}
      getContainer={getContainer}
    >
      <div className="flex flex-col px-20 w-full pt-12 pb-24">
        <div className="flex items-center mb-12 justify-center">
          <span className="text-20 font-medium text-r-neutral-title-1">
            {type === 'swap'
              ? t('page.bridge.pendingItem.swapStatus')
              : t('page.bridge.pendingItem.sendStatus')}
          </span>
        </div>
        <div className="tx-history__pending">
          {selectedList.map((item) => (
            <TransactionItem
              getContainer={getContainer}
              item={item}
              key={`${item.chainId}-${item.nonce}`}
              canCancel={
                minBy(
                  pendingList.filter((i) => i.chainId === item.chainId),
                  (i) => i.nonce
                )?.nonce === item.nonce
              }
              onComplete={() => handleTxComplete()}
              onClearPending={() => {
                init();
              }}
              txRequests={txRequests}
              onQuickCancel={init}
            />
          ))}
        </div>
      </div>
    </Popup>
  );
};
