import { TransactionGroup } from '@/background/service/transactionHistory';
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

  const rank = useMemo(() => {
    return list.findIndex((item) => item.id === txRequest?.tx_id) + 1;
  }, [txRequest?.tx_id, list]);

  const [tab, setTab] = React.useState<'all' | 'same'>('all');
  const [isFilterBaseFee, setIsFilterBaseFee] = React.useState(false);
  const [value, setValue] = React.useState<FilterItem[]>([]);

  const filterList = useMemo(() => {
    return list.filter((item) => {
      return value.every((filter) => {
        return filter.filter(item);
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

  useEffect(() => {
    if (tab === 'same') {
      setValue(filters);
    }
  }, [filters, tab]);

  const stat = useMemo(() => {
    const res: Record<string, number> = {
      total: 0,
    };
    list.forEach((item) => {
      res.total++;
      filters.forEach((filter) => {
        if (filter.filter(item)) {
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
  }, [tx, list, value]);

  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="flex items-center mb-[18px]">
        <div className="card-title">
          {rank
            ? t('page.pendingDetail.PendingTxList.title', { rank: rank })
            : t('page.pendingDetail.PendingTxList.titleNotFound')}
        </div>
      </div>

      <div>
        <div className="flex items-center">
          <PillsSwitch
            value={tab}
            options={
              [
                {
                  key: 'all',
                  label: `All Pending Txs (${
                    data?.pending_tx_list?.length || 0
                  })`,
                },
                {
                  key: 'same',
                  label: `Same as Current (${stat.sameAsCurrent || 0})`,
                },
              ] as const
            }
            onTabChange={(key) => setTab(key as any)}
            itemClassname="text-[15px] leading-[18px] font-medium px-[18px] pt-[10px] pb-[8px] w-auto min-w-[200px]"
            itemClassnameInActive="text-r-neutral-body"
            className="p-[2px]"
          />
          <div className="ml-auto">
            <div
              className="flex items-center gap-[4px] cursor-pointer text-r-neutral-body text-[15px] leading-[18px]"
              onClick={() => {
                setIsFilterBaseFee(!isFilterBaseFee);
              }}
            >
              {isFilterBaseFee ? (
                <img src={IconChecked} alt="" />
              ) : (
                <img src={IconUncheck} alt="" />
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
