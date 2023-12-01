import { TransactionGroup } from '@/background/service/transactionHistory';
import { ReactComponent as RcIconArrow } from '@/ui/assets/pending/icon-arrow-down.svg';
import IconNoLoss from '@/ui/assets/pending/icon-check-1.svg';
import IconCheck from '@/ui/assets/pending/icon-check-2.svg';
import IconError from '@/ui/assets/pending/icon-error.svg';
import IconToken from '@/ui/assets/pending/icon-token.svg';
import IconWarning from '@/ui/assets/pending/icon-warning.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { formatAmount, sinceTime } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import {
  LatestExplainTxResponse,
  TokenItem,
  TransferingNFTItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import clsx from 'clsx';
import _ from 'lodash';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknownNFT from 'ui/assets/pending/icon-unknown-nft.svg';
import NFTAvatar from '../../../Dashboard/components/NFT/NFTAvatar';
import { Empty } from '../Empty';
import { Loading } from './Loading';
import { useSinceTimeWithSecs } from '@/ui/hooks/useSinceTimeWithSecs';

export interface Props {
  explain?: TransactionGroup['explain'];
  latestExplain?: LatestExplainTxResponse;
  loading?: boolean;
  isPending?: boolean;
}

const isNFTItem = (
  item: TokenItem | TransferingNFTItem
): item is TransferingNFTItem => {
  return item && 'is_erc721' in item;
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
  const currentDict = _.keyBy(current, (item) => {
    return `${item.chain}_${item.id}`;
  });
  const nextDict = _.keyBy(next, (item) => {
    return `${item.chain}_${item.id}`;
  });
  const list = _.uniq(
    [...current, ...next].map((item) => `${item.chain}_${item.id}`)
  );
  return list.map((key) => {
    const item = currentDict[key];
    const latest = nextDict[key];

    const isNFT = isNFTItem(item);

    const currentAmount = item?.amount || 0;
    const latestAmount = latest?.amount || 0;
    if (currentAmount * negative > latestAmount * negative) {
      return {
        token: isNFT ? null : item,
        nextToken: isNFT ? null : (latest as TokenItem),
        nft: isNFT ? item : null,
        nextNFT: isNFT ? (latest as TransferingNFTItem) : null,
        diff: Math.abs(currentAmount - latestAmount),
        percent: currentAmount
          ? Math.abs(
              ((currentAmount - latestAmount) / currentAmount) * 100
            ).toFixed(2)
          : null,
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
          src={token.logo_url || IconToken}
          alt=""
          className="w-[16px] h-[16px] rounded-full"
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
          unknown={IconUnknownNFT}
        ></NFTAvatar>
        <div className="text-r-neutral-title-1  text-[13px] font-medium">
          {isNegative ? '-' : '+'} {formatAmount(nft.amount, 0)} {name}
        </div>
      </div>
    );
  }
  return null;
};

export const PrePackInfo = ({
  explain,
  latestExplain,
  loading,
  isPending,
}: Props) => {
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
      title: t('page.pendingDetail.PrePackInfo.col.prePackContent'),
      render(value, record, index) {
        const prev = res[index - 1];
        if (prev?.isNegative !== record.isNegative) {
          return (
            <div>
              {record.isNegative
                ? t('page.pendingDetail.PrePackInfo.type.pay')
                : t('page.pendingDetail.PrePackInfo.type.receive')}
            </div>
          );
        }
        return null;
      },
      width: 220,
    },
    {
      title: t('page.pendingDetail.PrePackInfo.col.expectations'),
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
      title: t('page.pendingDetail.PrePackInfo.col.prePackResults'),
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
      title: t('page.pendingDetail.PrePackInfo.col.difference'),
      render(value, record, index) {
        if (!record.diff) {
          if (!record?.nextNFT && !record?.nextToken) {
            return null;
          }
          return (
            <div className="flex items-center gap-[6px] text-r-blue-default font-medium">
              <img src={IconNoLoss} alt="" />
              {t('page.pendingDetail.PrePackInfo.noLoss')}
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

  const isEmpty = !res?.length || !isPending;

  const lastExplainTime = useSinceTimeWithSecs(latestExplain?.create_at);

  return (
    <div
      className={clsx(
        'card mb-[24px] pt-[16px] bg-r-neutral-bg-1',
        isCollapse && 'pb-[16px]'
      )}
    >
      <div
        className="flex items-center cursor-pointer"
        onClick={() => {
          setIsCollapse(!isCollapse);
        }}
      >
        <div className="text-r-neutral-title-1 text-[20px] leading-[24px] font-medium">
          {t('page.pendingDetail.PrePackInfo.title')}
        </div>
        {
          <div className="ml-auto flex items-center gap-[16px]">
            {loading || !isPending ? null : (
              <>
                {preExecError ? (
                  <div className="flex items-center gap-[6px] text-r-red-default  text-[15px] leading-[18px] font-medium">
                    <img src={IconError} alt="" />
                    {t('page.pendingDetail.PrePackInfo.error', {
                      count: 1,
                    })}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-[8px] text-r-blue-default  text-[15px] leading-[18px] font-medium">
                      <img src={IconCheck} alt="" />
                      {t('page.pendingDetail.PrePackInfo.noError')}
                    </div>
                    {lossCount > 0 ? (
                      <div className="flex items-center gap-[8px] text-r-orange-default  text-[15px] leading-[18px] font-medium">
                        <img src={IconWarning} alt="" />
                        {t('page.pendingDetail.PrePackInfo.loss', {
                          lossCount: lossCount,
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-[8px] text-r-blue-default  text-[15px] leading-[18px] font-medium">
                        <img src={IconCheck} alt="" />
                        {t('page.pendingDetail.PrePackInfo.noLoss')}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <div
              className={clsx(
                'cursor-pointer hover:bg-r-neutral-card-2 w-[32px] h-[32px] flex items-center justify-center rounded-[2px]',
                isCollapse ? '' : 'rotate-180'
              )}
            >
              <ThemeIcon src={RcIconArrow} />
            </div>
          </div>
        }
      </div>
      {isCollapse ? null : (
        <>
          <div className="text-r-neutral-foot text-[12px] mt-[8px] leading-[14px]">
            {t('page.pendingDetail.PrePackInfo.desc', {
              time: lastExplainTime,
            })}
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
