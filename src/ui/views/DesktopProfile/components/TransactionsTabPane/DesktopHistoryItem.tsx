import React, { useMemo } from 'react';
import {
  TokenItem,
  TxDisplayItem,
  TxHistoryItem,
} from '@/background/service/openapi';
import { sinceTime, useWallet } from 'ui/utils';
import clsx from 'clsx';
import { getChain } from '@/utils';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { TokenChange, TxId, TxInterAddressExplain } from '@/ui/component';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

type HistoryItemProps = {
  data: TxDisplayItem | TxHistoryItem;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

export const DesktopHistoryItem = ({
  data,
  cateDict,
  projectDict,
  tokenDict,
}: HistoryItemProps) => {
  const chainItem = getChain(data.chain);
  const isFailed = data.tx?.status === 0;
  const isScam = data.is_scam;
  const { t } = useTranslation();

  if (!chainItem) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex items-center py-3 px-5 border-b border-rabby-neutral-line hover:bg-r-neutral-card-2 transition-colors relative',
        (isScam || isFailed) && 'opacity-60'
      )}
    >
      {isScam && (
        <TooltipWithMagnetArrow
          title={t('page.transactions.txHistory.scamToolTip')}
          className="rectangle w-[max-content] max-w-[340px]"
        >
          <div className="tag-scam absolute top-0 left-0 opacity-50">
            {t('global.scamTx')}
          </div>
        </TooltipWithMagnetArrow>
      )}

      {/* Column 1 - Time */}
      <div className="w-[140px] flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-13 text-r-neutral-body">
            {sinceTime(data.time_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <img
            src={chainItem.logo}
            alt={chainItem.name}
            className="w-4 h-4 rounded-full"
          />
          <div className="text-12 text-r-neutral-foot font-mono">
            <TxId chain={data.chain} id={data.id} />
          </div>
        </div>
      </div>

      {/* Column 2 - Transaction Type/Details */}
      <div className="flex-1 min-w-0 mx-4">
        <TxInterAddressExplain
          data={data}
          projectDict={projectDict}
          tokenDict={tokenDict}
          cateDict={cateDict}
        />
      </div>

      {/* Column 3 - Token Changes */}
      <div className="w-[200px] flex-shrink-0 mx-4">
        <TokenChange data={data} tokenDict={tokenDict} />
      </div>

      {/* Column 4 - Gas Fee and Status */}
      <div className="w-[200px] flex-shrink-0 text-right">
        {data.tx && data.tx?.eth_gas_fee ? (
          <div className="text-12 text-r-neutral-foot">
            Gas fee: {numberWithCommasIsLtOne(data.tx?.eth_gas_fee, 4)}{' '}
            {chainItem?.nativeTokenSymbol} ($
            {numberWithCommasIsLtOne(data.tx?.usd_gas_fee ?? 0, 2)})
          </div>
        ) : null}

        {isFailed && (
          <span className="text-12 text-red-500 bg-red-50 px-2 py-0.5 rounded inline-block mt-1">
            {t('global.failed')}
          </span>
        )}
      </div>
    </div>
  );
};
