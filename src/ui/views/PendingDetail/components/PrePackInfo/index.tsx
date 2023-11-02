import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React, { useMemo } from 'react';
import IconBox from '@/ui/assets/pending/icon-box.svg';
import IconClock from '@/ui/assets/pending/icon-clock.svg';
import { TransactionGroup } from '@/background/service/transactionHistory';
import {
  LatestExplainTxResponse,
  TokenItem,
  TransferingNFTItem,
} from '@rabby-wallet/rabby-api/dist/types';
import _ from 'lodash';
import { formatAmount, sinceTime } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import IconUnknown from '@/ui/assets/icon-unknown.svg';
import clsx from 'clsx';
import NFTAvatar from '../../../Dashboard/components/NFT/NFTAvatar';
import { useTranslation } from 'react-i18next';
import IconWarning from '@/ui/assets/pending/icon-warning.svg';
import IconNoLoss from '@/ui/assets/pending/icon-check-1.svg';
import IconCheck from '@/ui/assets/pending/icon-check-2.svg';
import IconError from '@/ui/assets/pending/icon-error.svg';
import IconArrow from '@/ui/assets/pending/icon-arrow-down.svg';
import { Empty } from '../Empty';
import { Loading } from './Loading';

export interface Props {
  explain?: TransactionGroup['explain'];
  latestExplain?: LatestExplainTxResponse;
  loading?: boolean;
}

const isNFTItem = (
  item: TokenItem | TransferingNFTItem
): item is TransferingNFTItem => {
  return 'is_erc721' in item;
};

const transformToken = ({
  current,
  next,
  isNegative,
}: {
  current: (TokenItem | TransferingNFTItem)[];
  next: (TokenItem | TransferingNFTItem)[];
  isNegative: boolean;
}) => {
  const negative = isNegative ? -1 : 1;
  const nextDict = _.keyBy(next, (item) => {
    return `${item.chain}_${item.id}`;
  });
  return current.map((item) => {
    const key = `${item.chain}_${item.id}`;
    const latest = nextDict[key];

    const isNFT = isNFTItem(item);

    const latestAmount = latest?.amount || 0;
    if (item.amount * negative > latestAmount * negative) {
      return {
        token: isNFT ? null : item,
        nextToken: isNFT ? null : (latest as TokenItem),
        nft: isNFT ? item : null,
        nextNFT: isNFT ? (latest as TransferingNFTItem) : null,
        diff: Math.abs(item.amount - latestAmount),
        percent: Math.abs(
          ((item.amount - latestAmount) / item.amount) * 100
        ).toFixed(2),
        isNegative,
      };
    }

    return {
      token: isNFT ? null : item,
      nextToken: isNFT ? null : (latest as TokenItem),
      nft: isNFT ? item : null,
      nextNFT: isNFT ? (latest as TransferingNFTItem) : null,
      diff: 0,
      percent: null,
      isNegative,
    };
  });
};

const TokenChange = ({
  token,
  nft,
  isNegative,
}: {
  token?: TokenItem | null;
  nft?: TransferingNFTItem | null;
  isNegative: boolean;
}) => {
  const { t } = useTranslation();
  if (token) {
    return (
      <div className="flex items-center gap-[8px]">
        <img
          src={token.logo_url || IconUnknown}
          alt=""
          className="w-[16px] h-[16px]"
        />
        <div className="text-r-neutral-title-1 text-[13px] font-medium">
          {isNegative ? '-' : '+'} {formatAmount(token.amount)}{' '}
          {getTokenSymbol(token)}
        </div>
      </div>
    );
  }
  if (nft) {
    const name = nft?.name || t('global.unknownNFT');
    return (
      <div className="flex items-center gap-[8px]">
        <NFTAvatar
          className="w-[16px] h-[16px]"
          thumbnail
          content={nft?.content}
          type={nft?.content_type}
        ></NFTAvatar>
        <div className="text-r-neutral-title-1  text-[13px] font-medium">
          {isNegative ? '-' : '+'} {name}
        </div>
      </div>
    );
  }
  return null;
};

export const PrePackInfo = ({ explain, latestExplain, loading }: Props) => {
  const currentChange = explain?.balance_change;
  const nextChange = latestExplain?.pre_exec_result?.balance_change;
  const { t } = useTranslation();
  const [isCollapse, setIsCollapse] = React.useState(true);

  const res = useMemo(() => {
    const list = [
      {
        key: 'send_token_list' as const,
        isNegative: true,
      },
      {
        key: 'send_nft_list' as const,
        isNegative: true,
      },
      {
        key: 'receive_token_list' as const,
        isNegative: false,
      },
      {
        key: 'receive_nft_list' as const,
        isNegative: false,
      },
    ];
    return _.flatten(
      list.map((item) => {
        return transformToken({
          current: currentChange?.[item.key] || [],
          next: nextChange?.[item.key] || [],
          isNegative: item.isNegative,
        });
      })
    );
  }, [currentChange, nextChange]);

  const columns: ColumnsType<typeof res[number]> = [
    {
      title: 'Pre-pack content',
      render(value, record, index) {
        const prev = res[index - 1];
        if (prev?.isNegative !== record.isNegative) {
          return <div>{record.isNegative ? 'Pay ' : 'Receive'}</div>;
        }
        return null;
      },
      width: 220,
    },
    {
      title: 'Expectations',
      render(value, record, index) {
        return (
          <TokenChange
            nft={record.nft}
            token={record.token}
            isNegative={record.isNegative}
          />
        );
      },
      width: 280,
    },
    {
      title: 'Pre-pack Results',
      render(value, record, index) {
        return (
          <TokenChange
            token={record.nextToken}
            nft={record.nextNFT}
            isNegative={record.isNegative}
          />
        );
      },
      width: 280,
    },
    {
      title: 'Conclusions',
      render(value, record, index) {
        if (!record.diff) {
          return (
            <div className="flex items-center gap-[6px] text-r-blue-default font-medium">
              <img src={IconNoLoss} alt="" />
              No loss found
            </div>
          );
        }
        return (
          <div className="flex items-center gap-[6px] text-r-orange-default font-medium">
            <img src={IconWarning} alt="" />
            <div>
              - {formatAmount(record.diff)}{' '}
              {record?.token
                ? getTokenSymbol(record.token)
                : record?.nft?.name || t('global.unknownNFT')}
              ({record.percent}%)
            </div>
          </div>
        );
      },
    },
  ];

  const lossCount = useMemo(() => {
    return res.filter((item) => item.diff).length;
  }, [res]);

  const preExecError = latestExplain?.pre_exec_result?.pre_exec?.error;

  const isEmpty = !res?.length;

  return (
    <div
      className={clsx('card mb-[24px] pt-[20px]', isCollapse && 'pb-[20px]')}
    >
      <div className="flex items-center">
        <div className="text-r-neutral-title-1 text-[20px] leading-[24px] font-medium">
          Pre-pack check
        </div>
        <div className="ml-auto flex items-center gap-[16px]">
          {preExecError ? (
            <div className="flex items-center gap-[6px] text-r-red-default  text-[15px] leading-[18px] font-medium">
              <img src={IconError} alt="" />1 error found
            </div>
          ) : (
            <>
              <div className="flex items-center gap-[8px] text-r-blue-default  text-[15px] leading-[18px] font-medium">
                <img src={IconCheck} alt="" />
                No error found
              </div>
              {lossCount > 0 ? (
                <div className="flex items-center gap-[8px] text-r-orange-default  text-[15px] leading-[18px] font-medium">
                  <img src={IconWarning} alt="" />
                  {lossCount} loss found
                </div>
              ) : (
                <div className="flex items-center gap-[8px] text-r-blue-default  text-[15px] leading-[18px] font-medium">
                  <img src={IconCheck} alt="" />
                  No loss found
                </div>
              )}
            </>
          )}
          <img
            src={IconArrow}
            className={clsx('cursor-pointer', isCollapse ? '' : 'rotate-180')}
            alt=""
            onClick={() => {
              setIsCollapse(!isCollapse);
            }}
          />
        </div>
      </div>
      {isCollapse ? null : (
        <>
          <div className="text-r-neutral-foot text-[12px] mt-[8px] leading-[14px]">
            Simulation executed in the latest block, updated{' '}
            {latestExplain?.create_at
              ? sinceTime(latestExplain?.create_at || 0)
              : null}
          </div>
          <div className="bg-r-neutral-line h-[0.5px] mx-[-24px] mt-[16px]"></div>
          {preExecError ? (
            <div className="flex items-center gap-[6px] text-r-red-default  text-[15px] leading-[18px] font-medium py-[16px]">
              <img src={IconError} alt="" /> {preExecError?.msg}
            </div>
          ) : (
            <>
              {loading ? (
                <Loading />
              ) : (
                <>
                  {isEmpty ? (
                    <Empty />
                  ) : (
                    <Table
                      className="simple-table"
                      columns={columns}
                      dataSource={res}
                      pagination={false}
                      rowKey={(item) => item.token?.id || item.nft?.id || ''}
                    ></Table>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
