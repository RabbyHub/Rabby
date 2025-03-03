import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';
import clsx from 'clsx';
import dayjs from 'dayjs';
import React from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from 'react-use';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/dashboard/info-cc.svg';
import { ReactComponent as RcIconCloseCC } from '@/ui/assets/component/close-cc.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { KEYRING_CLASS } from '@/constant';
import { pick } from 'lodash';

const useOfflineChains = () => {
  const wallet = useWallet();

  const { value: closedTipsChains } = useAsync(
    () => wallet.getCloseTipsChains(),
    []
  );

  const setClosedTipsChain = React.useCallback(
    (chains: string[]) => {
      wallet.setCloseTipsChains(chains);
    },
    [wallet.setCloseTipsChains]
  );

  const accountsList = useRabbySelector((s) => s.accountToDisplay.accountsList);

  const balanceMap = useRabbySelector(
    (s) => s.account.balanceAboutCacheMap.balanceMap
  );

  const { value } = useAsync(() => wallet.openapi.getOfflineChainList(), []);

  const accountsValues = useMemo(() => {
    const notWatchAccountList = accountsList
      .filter((e) => e.type !== KEYRING_CLASS.WATCH)
      .map((e) => e.address?.toLowerCase());

    const accounts = pick(balanceMap, notWatchAccountList);

    const accountsValues = Object.values(accounts);
    return accountsValues;
  }, [balanceMap, accountsList]);

  const offlineList = useMemo(() => {
    if (!value || !accountsValues.length) {
      return [];
    }

    return value
      ?.filter(
        (e) =>
          accountsValues.some((item) =>
            item.chain_list.some(
              (chain) => chain.id === e.id && chain.usd_value >= 1
            )
          ) &&
          dayjs.unix(e.offline_at).isAfter(dayjs()) &&
          dayjs().add(7, 'day').isAfter(dayjs.unix(e.offline_at))
      )
      .sort((a, b) => b.offline_at - a.offline_at);
  }, [value, accountsValues]);

  return { offlineList, setClosedTipsChain, closedTipsChains };
};

export const OfflineChainNotify = () => {
  const { t } = useTranslation();
  const {
    offlineList,
    setClosedTipsChain,
    closedTipsChains = [],
  } = useOfflineChains();

  const [closedList, setClosedList] = useState<string[]>([]);

  const setClose = React.useCallback(
    (id: string) => {
      setClosedList((pre) => [...pre, id]);
      setClosedTipsChain([id]);
    },
    [setClosedTipsChain]
  );

  return (
    <div className={clsx('absolute left-0 bottom-0 w-full')}>
      {offlineList?.map((e) => {
        const chainInfo = findChainByServerID(e.id);
        if (
          !chainInfo ||
          closedList.includes(e.id) ||
          closedTipsChains.includes(e.id)
        ) {
          return null;
        }

        return (
          <div
            className={clsx(
              'hidden last:flex',
              'w-full h-auto min-h-[32px] bg-rabby-orange-light',
              'items-center px-16',
              'border-[0.5px] border-solid border-rabby-neutral-line'
            )}
          >
            <img src={chainInfo.logo} className="w-16 h-16 rounded-full" />
            <span className="ml-4 text-13 font-medium text-r-neutral-title1">
              {t('page.dashboard.offlineChain.chain', {
                chain: chainInfo.name,
              })}
            </span>

            <TooltipWithMagnetArrow
              placement="bottom"
              overlayClassName="rectangle w-[max-content]"
              title={t('page.dashboard.offlineChain.tips', {
                chain: chainInfo.name,
                date: dayjs(e.offline_at * 1000).format('MM/DD'),
              })}
            >
              <RcIconInfoCC
                viewBox="0 0 16 16"
                className="w-16 h-16 text-r-neutral-body ml-auto"
              />
            </TooltipWithMagnetArrow>
            <RcIconCloseCC
              viewBox="0 0 20 20"
              className="w-16 h-16 text-r-neutral-body ml-12 cursor-pointer"
              onClick={() => {
                setClose(e.id);
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
