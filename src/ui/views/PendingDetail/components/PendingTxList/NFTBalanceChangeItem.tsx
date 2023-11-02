import { NameAndAddress } from '@/ui/component';
import { numberWithCommasIsLtOne, useWallet } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import {
  NFTItem,
  PendingTxItem,
  TokenItem,
  TxRequest,
} from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { Checkbox, Table, Tabs } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import IconUser from 'ui/assets/address-management.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconChecked from 'ui/assets/pending/icon-checkbox-checked.svg';
import IconUncheck from 'ui/assets/pending/icon-checkbox-uncheck.svg';
import IconHelp from 'ui/assets/pending/icon-help.svg';
import {
  ApproveTokenRequireData,
  SendRequireData,
  SwapRequireData,
  getActionTypeTextByType,
} from '../../../Approval/components/Actions/utils';
import NFTAvatar from '../../../Dashboard/components/NFT/NFTAvatar';
import { TransactionGroup } from '@/background/service/transactionHistory';
import { ellipsisAddress } from '@/ui/utils/address';
import { ReactComponent as RcIconCheck } from '@/ui/assets/pending/icon-checked.svg';
import PillsSwitch from '@/ui/component/PillsSwitch';
import _ from 'lodash';
import { findMaxGasTx } from '@/utils/tx';
import { Empty } from '../Empty';

export const TokenBalanceChangeItem = ({
  item,
  prefix,
  tokenDict,
}: {
  item: NonNullable<
    PendingTxItem['pre_exec_result']
  >['balance_change']['send_token_list'][0];
  tokenDict?: Record<string, TokenItem>;
  prefix: ReactNode;
}) => {
  const token = tokenDict?.[item.token_id];
  return (
    <div className="flex items-center gap-[8px]">
      <img
        className="w-[16px] h-[16px]"
        src={token?.logo_url || IconUnknown}
        alt=""
      />
      <div className="text-r-neutral-title-1 font-medium">
        {prefix} {numberWithCommasIsLtOne(item.amount, 2)}{' '}
        {getTokenSymbol(token)}
      </div>
    </div>
  );
};

export const NFTBalanceChangeItem = ({
  item,
  prefix,
  tokenDict,
}: {
  item: NonNullable<
    PendingTxItem['pre_exec_result']
  >['balance_change']['send_nft_list'][0];
  prefix: ReactNode;
  tokenDict?: Record<string, NFTItem>;
}) => {
  const { t } = useTranslation();
  const token = tokenDict?.[item.token_id];
  const symbol = '';
  const name =
    token?.name ||
    (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'));
  return (
    <div className="flex items-center gap-[8px]">
      <NFTAvatar
        className="w-[16px] h-[16px]"
        thumbnail
        content={token?.content}
        type={token?.content_type}
      ></NFTAvatar>
      <div className="text-r-neutral-title-1 font-medium">
        {prefix} {name}
      </div>
    </div>
  );
};

const BalanceChange = ({
  data,
  tokenDict,
}: {
  data?: NonNullable<PendingTxItem['pre_exec_result']>['balance_change'];
  tokenDict?: Record<string, any>;
}) => {
  if (!data) {
    return null;
  }
  return (
    <div className="flex flex-col gap-[8px]">
      {data?.send_token_list?.map((item, index) => {
        return (
          <TokenBalanceChangeItem
            key={`${item.token_id}-${index}-send`}
            prefix="-"
            item={item}
            tokenDict={tokenDict}
          />
        );
      })}
      {data?.receive_token_list?.map((item, index) => {
        return (
          <TokenBalanceChangeItem
            key={`${item.token_id}-${index}-receive`}
            prefix="+"
            item={item}
            tokenDict={tokenDict}
          />
        );
      })}
      {data?.send_nft_list?.map((item, index) => {
        return (
          <NFTBalanceChangeItem
            key={`${item.token_id}-${index}-send`}
            prefix="-"
            item={item}
          />
        );
      })}
      {data?.receive_nft_list?.map((item, index) => {
        return (
          <NFTBalanceChangeItem
            key={`${item.token_id}-${index}-receive`}
            prefix="+"
            item={item}
          />
        );
      })}
    </div>
  );
};

const TransactionAction = ({ data }: { data: PendingTxItem }) => {
  const protocol = data.to_addr_desc?.protocol;

  const isSend = data?.action_type === 'send_token';

  const icon =
    data?.action_type === 'send_token'
      ? IconUser
      : protocol?.logo_url || IconUnknown;

  return (
    <div className="flex items-center gap-[12px]">
      <img
        src={icon}
        alt=""
        className={clsx(
          'flex-shrink-0 w-[32px] h-[32px]',
          isSend ? '' : 'rounded-full'
        )}
      />{' '}
      <div className="min-w-0">
        <div className="text-r-neutral-title-1 font-medium mb-[4px]">
          {getActionTypeTextByType(data.action_type)}
        </div>
        <div className="text-r-neutral-body">
          {protocol?.name ? (
            <>{protocol?.name}</>
          ) : (
            <NameAndAddress
              className="justify-start text-r-neutral-body"
              addressClass="text-r-neutral-body text-[13px]"
              address={data.to_addr}
              copyIcon={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const MempoolTxTable = ({
  list,
  tokenDict,
  hash,
}: {
  list: PendingTxItem[];
  tokenDict: Record<string, TokenItem | NFTItem>;
  hash?: string | null;
}) => {
  const wallet = useWallet();
  const columns: ColumnsType<PendingTxItem> = [
    {
      title: '#',
      render(value, record, index) {
        const idx = list.indexOf(record) + 1;

        return (
          <>
            {hash === record.id ? (
              <div className="is-current-tx">
                <div className="is-current-tx-tag">Current</div>
              </div>
            ) : null}
            {idx}
          </>
        );
      },
      width: 120,
    },
    {
      title: 'Gas Price',
      render(value, record, index) {
        return <div>{Number(record.gas_price || 0)} gwei</div>;
      },
      width: 240,
    },
    {
      title: 'Transaction Action',
      render(value, record, index) {
        return <TransactionAction data={record} />;
      },
      width: 304,
    },
    {
      title: 'Balance change',
      render(value, record, index) {
        return (
          <BalanceChange
            data={record.pre_exec_result?.balance_change}
            tokenDict={tokenDict}
          />
        );
      },
    },
  ];

  const isEmpty = !list?.length;
  if (isEmpty) {
    return <Empty />;
  }

  return (
    <Table
      columns={columns}
      dataSource={list || []}
      pagination={{
        simple: true,
        pageSize: 50,
        position: ['bottomCenter'],
      }}
      className="simple-table"
    ></Table>
  );
};

interface FilterItem {
  label: ReactNode;
  filter(
    item: PendingTxItem,
    tokenDict?: Record<string, TokenItem | NFTItem>
  ): boolean;
  key: string;
}

const createFilter = (tx: TransactionGroup) => {
  const results: FilterItem[] = [];

  if (tx.action?.actionData?.send) {
    const requiredData = tx.action?.requiredData as SendRequireData;
    results.push({
      label: 'Action: Send Token',
      filter: (item: PendingTxItem) => {
        return item.action_type === 'send_token';
      },
      key: 'sendTokenFilter',
    });
    if (requiredData.cex) {
      results.push({
        label: `Send To Cex`,
        filter: (item: PendingTxItem) => {
          return !!item.to_addr_desc?.cex;
        },
        key: 'sendToCexFilter',
      });
    }
  } else if (tx.action?.actionData?.swap) {
    const requiredData = tx.action?.requiredData as SwapRequireData;
    results.push({
      label: `Action: Swap Token`,
      filter: (item: PendingTxItem) => {
        return item.action_type === 'swap_token';
      },
      key: 'swapFilter',
    });
    if (requiredData?.id) {
      results.push({
        label: `Interact Contract:${
          requiredData.protocol?.name || ellipsisAddress(requiredData.id)
        }`,
        filter: (item: PendingTxItem) => {
          return item.to_addr === requiredData.id;
        },
        key: `contractFilter-${requiredData.id}`,
      });
    }
  } else if (tx.action?.actionData?.approveToken) {
    const requiredData = tx.action?.requiredData as ApproveTokenRequireData;
    results.push({
      label: `Approve To: ${
        requiredData?.protocol?.name || ellipsisAddress(requiredData?.token?.id)
      }`,
      filter: (item: PendingTxItem) => {
        return (
          item.action_type === 'approve_token' &&
          item.to_addr === requiredData?.token?.id
        );
      },
      key: `approveTokenFilter-${requiredData?.token?.id}`,
    });
  }

  const tokenList = (tx.explain?.balance_change?.send_token_list || []).concat(
    tx.explain?.balance_change?.receive_token_list || []
  );
  if (tokenList.length > 0) {
    tokenList.forEach((token) => {
      results.push({
        label: (
          <div className="inline-flex items-center gap-[6px]">
            <img
              src={token.logo_url || IconUnknown}
              className="w-[16px] h-[16px]"
              alt=""
            />
            {getTokenSymbol(token)}
            {/* todo cross chain */}
          </div>
        ),
        filter: (item: PendingTxItem) => {
          const list = (
            item.pre_exec_result?.balance_change?.send_token_list || []
          ).concat(
            item.pre_exec_result?.balance_change?.receive_token_list || []
          );
          return !!list.find((t) => t.token_id === token.id);
        },
        key: `tokenFilter-${token.id}-${token.chain}`,
      });
    });
  }

  const nftList = _.uniqBy(
    (tx.explain?.balance_change?.send_nft_list || []).concat(
      tx.explain?.balance_change?.receive_nft_list || []
    ),
    'collection_id'
  );

  if (nftList.length > 0) {
    nftList.forEach((nft) => {
      results.push({
        label: `Collection: ${
          nft.collection?.name || ellipsisAddress(nft.contract_id)
        }`,
        filter: (item: PendingTxItem, tokenDict) => {
          const list = (
            item.pre_exec_result?.balance_change?.send_nft_list || []
          ).concat(
            item.pre_exec_result?.balance_change?.receive_nft_list || []
          );

          return !!list.find((t) => {
            const n = tokenDict?.[t.token_id] as NFTItem;
            return n?.contract_id === nft.contract_id;
          });
        },
        key: `nftFilter-${nft.contract_id}-${nft.chain}`,
      });
    });
  }

  return results;
};

const Filters = ({
  tx,
  value,
  onChange,
  options,
  stat,
}: {
  tx?: TransactionGroup;
  value: FilterItem[];
  onChange: (v: FilterItem[]) => void;
  options: FilterItem[];
  stat: Record<string, number>;
}) => {
  console.log(tx);

  return (
    <div className="flex flex-wrap gap-[12px]">
      {options.map((item) => {
        return (
          <div
            key={item.key}
            className={clsx(
              'flex items-center gap-[6px] px-[8px] py-[9px] rounded-[4px] cursor-pointer border',
              value.includes(item)
                ? 'border-[#7084FF] bg-r-blue-light-1 text-r-blue-default'
                : 'border-[#D3D8E0] text-r-neutral-title-1'
            )}
            onClick={() => {
              if (value.includes(item)) {
                onChange(value.filter((v) => v !== item));
              } else {
                onChange([...value, item]);
              }
            }}
          >
            <RcIconCheck />
            <div className=" text-[13px] leading-[16px] font-medium flex items-center">
              {item.label}{' '}
              <span className="font-normal">({stat[item.key] || 0})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// const SameAsCurrentTab = ({
//   tx,
//   list,
//   tokenDict,
// }: {
//   tx?: TransactionGroup;
//   list: PendingTxItem[];
//   tokenDict: Record<string, TokenItem | NFTItem>;
// }) => {

//   const data = useMemo(() => {
//     return list.filter((item) => {
//       return value.every((filter) => {
//         return filter.filter(item);
//       });
//     });
//   }, [tx, list, value]);

//   return (
//     <div>
//       <Filters value={value} onChange={setValue} tx={tx} />
//       <MempoolTxTable list={data} tokenDict={tokenDict} />
//     </div>
//   );
// };

export const PendingTxList = ({
  tx,
  txRequest,
}: {
  tx?: TransactionGroup;
  txRequest?: TxRequest;
}) => {
  const wallet = useWallet();
  const { data } = useRequest(() =>
    wallet.openapi.getPendingTxList({
      chain_id: 'eth',
    })
  );

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

  const filters = useMemo(() => {
    if (!tx) {
      return [];
    }
    return createFilter(tx);
  }, [tx]);

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
      if (filters.every((filter) => filter.filter(item, tokenDict))) {
        res.sameAsCurrent = (res.sameAsCurrent || 0) + 1;
      }
    });
    return res;
  }, [tx, list, value]);

  return (
    <div className="card">
      <div className="flex items-center mb-[18px]">
        <div className="card-title">
          GasPrice Ranks #{rank} in Same as Current Tx
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
              Only meets Base fee requirement
              <img src={IconHelp} alt="" />
            </div>
          </div>
        </div>
        {tab === 'all' ? (
          <div className="mt-[18px]">
            <MempoolTxTable
              hash={txRequest?.tx_id}
              list={data?.pending_tx_list || []}
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
            <MempoolTxTable
              list={filterList}
              hash={txRequest?.tx_id}
              tokenDict={data?.token_dict || {}}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
