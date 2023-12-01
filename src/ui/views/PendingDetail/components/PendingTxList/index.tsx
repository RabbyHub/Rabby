import {
  TransactionGroup,
  TransactionHistoryItem,
} from '@/background/service/transactionHistory';
import PillsSwitch from '@/ui/component/PillsSwitch';
import { useWallet } from '@/ui/utils';
import {
  NFTItem,
  PendingTxItem,
  TokenItem,
  TxRequest,
} from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import React, { useEffect, useMemo } from 'react';
import IconChecked from 'ui/assets/pending/icon-checkbox-checked.svg';
import IconUncheck from 'ui/assets/pending/icon-checkbox-uncheck.svg';
import IconHelp from 'ui/assets/pending/icon-help.svg';
import { FilterItem, Filters, createFilter } from './Filters';
import { PendingTxTable } from './PendingTxTable';
import { Loading } from './Loading';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

const filterBaseFee = ({
  list,
  baseFee,
  enable,
}: {
  list: PendingTxItem[];
  baseFee?: number;
  enable;
}) => {
  if (!enable || !baseFee) {
    return list;
  }
  return list.filter((item) => {
    return (item.gas_price || 0) >= baseFee / 1e9;
  });
};
const useFilterBaseFee = ({
  list,
  baseFee,
  enable,
}: {
  list: PendingTxItem[];
  baseFee?: number;
  enable;
}) => {
  return useMemo(() => {
    return filterBaseFee({ list, baseFee, enable });
  }, [list, baseFee, enable]);
};
export const PendingTxList = ({
  tx,
  txRequest,
  loading,
  data,
  baseFee,
}: {
  tx?: TransactionGroup;
  txRequest?: TxRequest;
  loading?: boolean;
  baseFee?: number;
  data?: {
    pending_tx_list: PendingTxItem[];
    token_dict: Record<string, TokenItem | NFTItem>;
  };
}) => {
  const wallet = useWallet();

  const list = useMemo(() => data?.pending_tx_list || [], [
    data?.pending_tx_list,
  ]);
  const tokenDict = useMemo(() => data?.token_dict || {}, [data?.token_dict]);

  const [tab, setTab] = React.useState<'all' | 'same'>('all');
  const [isFilterBaseFee, setIsFilterBaseFee] = React.useState(false);
  const [value, setValue] = React.useState<FilterItem[]>([]);

  const filterList = useMemo(() => {
    return list.filter((item) => {
      return value.every((filter) => {
        return filter.filter(item, tokenDict);
      });
    });
  }, [tx, list, value]);

  const finalList = useFilterBaseFee({
    list,
    baseFee,
    enable: isFilterBaseFee,
  });

  const filters = useMemo(() => {
    if (!tx) {
      return [];
    }
    return createFilter(tx);
  }, [tx]);

  const finalFilterList = useFilterBaseFee({
    list: filters?.length ? filterList : [],
    baseFee,
    enable: isFilterBaseFee,
  });

  const rank = useMemo(() => {
    return finalList.findIndex((item) => item.id === txRequest?.tx_id) + 1;
  }, [txRequest?.tx_id, finalList]);

  const rankSame = useMemo(() => {
    return (
      finalFilterList.findIndex((item) => item.id === txRequest?.tx_id) + 1
    );
  }, [txRequest?.tx_id, finalFilterList]);

  const stat = useMemo(() => {
    const res: Record<string, number> = {
      total: 0,
    };
    finalList.forEach((item) => {
      res.total++;
      filters.forEach((filter) => {
        if (filter.filter(item, tokenDict)) {
          res[filter.key] = (res[filter.key] || 0) + 1;
        }
      });
      if (
        filters.length &&
        filters.every((filter) => filter.filter(item, tokenDict))
      ) {
        res.sameAsCurrent = (res.sameAsCurrent || 0) + 1;
      }
    });
    return res;
  }, [tx, finalList, value]);

  const { t } = useTranslation();

  const cardTitle = useMemo(() => {
    if (tab === 'all') {
      return rank
        ? t('page.pendingDetail.PendingTxList.title', { rank: rank })
        : t('page.pendingDetail.PendingTxList.titleNotFound');
    }
    if (tab === 'same') {
      return rankSame
        ? t('page.pendingDetail.PendingTxList.titleSame', { rank: rankSame })
        : t('page.pendingDetail.PendingTxList.titleSameNotFound');
    }
  }, [tab, rank, rankSame]);

  return (
    <div className="card">
      <div className="flex items-center mb-[18px]">
        <div className="card-title">{cardTitle}</div>
      </div>

      <div>
        <div className="flex items-center">
          <PillsSwitch
            value={tab}
            options={
              [
                {
                  key: 'all',
                  label: `All Pending Txs (${finalList?.length || 0})`,
                },
                {
                  key: 'same',
                  label: `Same as Current (${
                    tab === 'same'
                      ? finalFilterList?.length || 0
                      : stat.sameAsCurrent || 0
                  })`,
                },
              ] as const
            }
            onTabChange={(key) => {
              if (key === 'same') {
                setValue(filters);
              }
              setTab(key as any);
            }}
            itemClassname="text-[15px] leading-[18px] font-medium px-[18px] pt-[10px] pb-[8px] w-auto min-w-[200px]"
            itemClassnameInActive="text-r-neutral-body"
            className="p-[2px]"
          />
          <div className="ml-auto">
            <div
              className="flex items-center gap-[4px] cursor-pointer text-r-neutral-body text-[13px] leading-[16px]"
              onClick={() => {
                setIsFilterBaseFee(!isFilterBaseFee);
              }}
            >
              {isFilterBaseFee ? (
                <img src={IconChecked} className="w-[16px] h-[16px]" alt="" />
              ) : (
                <img src={IconUncheck} className="w-[16px] h-[16px]" alt="" />
              )}
              {t('page.pendingDetail.PendingTxList.filterBaseFee.label')}
              <Tooltip
                overlayClassName="rectangle w-[max-content]"
                title={t(
                  'page.pendingDetail.PendingTxList.filterBaseFee.tooltip'
                )}
              >
                <img src={IconHelp} alt="" />
              </Tooltip>
            </div>
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : (
          <>
            {tab === 'all' ? (
              <div className="mt-[18px]">
                <PendingTxTable
                  hash={txRequest?.tx_id}
                  list={finalList}
                  tokenDict={data?.token_dict || {}}
                />
              </div>
            ) : null}
            {tab === 'same' ? (
              <div className="mt-[18px]">
                {filters?.length ? (
                  <div className="mb-[8px]">
                    <Filters
                      tx={tx}
                      value={value}
                      onChange={setValue}
                      options={filters}
                      stat={stat}
                    />
                  </div>
                ) : null}
                <PendingTxTable
                  list={finalFilterList}
                  hash={txRequest?.tx_id}
                  tokenDict={data?.token_dict || {}}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
