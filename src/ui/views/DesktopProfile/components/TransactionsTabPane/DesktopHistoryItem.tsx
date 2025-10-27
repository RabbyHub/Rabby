import React, { useCallback, useMemo } from 'react';
import {
  TokenItem,
  TxDisplayItem,
  TxHistoryItem,
} from '@/background/service/openapi';
import { openInTab, sinceTime, useWallet } from 'ui/utils';
import clsx from 'clsx';
import { getChain, getTxScanLink } from '@/utils';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { TxId, TxInterAddressExplain } from '@/ui/component';
import { DesktopTokenChange } from './DesktopTokenChange';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import IconUnknown from 'ui/assets/token-default.svg';
import { ellipsis } from '@/ui/utils/address';

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
  const handleScanClick = useCallback(() => {
    if (chainItem) {
      const link = getTxScanLink(chainItem?.scanLink, data.id);
      openInTab(link);
    }
  }, [chainItem]);
  const { t } = useTranslation();

  if (!chainItem) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex h-[100px] items-center border-b-[0.5px] px-16 border-rabby-neutral-line relative',
        (isScam || isFailed) && 'opacity-50'
      )}
    >
      {isScam && (
        <TooltipWithMagnetArrow
          title={t('page.transactions.txHistory.scamToolTip')}
          className="rectangle w-[max-content] max-w-[340px]"
        >
          <div
            className="tag-scam absolute top-0 font-12 text-r-neutral-foot left-0 px-6 py-3 bg-r-neutral-card2"
            style={{ borderRadius: '0 0 8px 0' }}
          >
            {t('global.scamTx')}
          </div>
        </TooltipWithMagnetArrow>
      )}

      {/* Column 1 - Time */}
      <div className="w-[180px] flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-13 text-r-neutral-body">
            {sinceTime(data.time_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <img
            src={chainItem.logo || IconUnknown}
            alt={chainItem.name}
            className="w-16 h-16 rounded-full"
          />
          <a
            className="underline cursor-pointer text-13 text-r-neutral-foot ml-6"
            onClick={handleScanClick}
          >
            {ellipsis(data.id)}
          </a>
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
      <div className="flex-1 mx-4">
        <DesktopTokenChange data={data} tokenDict={tokenDict} />
      </div>

      {/* Column 4 - Gas Fee and Status */}
      <div className="w-[200px] flex-shrink-0 text-right">
        {data.tx && data.tx?.eth_gas_fee ? (
          <div className="text-13 text-r-neutral-foot">
            Gas fee: {numberWithCommasIsLtOne(data.tx?.eth_gas_fee, 4)}{' '}
            {chainItem?.nativeTokenSymbol} ($
            {numberWithCommasIsLtOne(data.tx?.usd_gas_fee ?? 0, 2)})
          </div>
        ) : (
          <div></div>
        )}

        {isFailed && (
          <span className="text-13 text-r-red-default">
            {t('global.failed')}
          </span>
        )}
      </div>
    </div>
  );
};
