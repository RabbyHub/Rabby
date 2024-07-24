import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { InsHTMLAttributes, useMemo } from 'react';

import { ReactComponent as IconQuoteSwitchCC } from '@/ui/assets/swap/switch-cc.svg';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SelectedBridgeQuote } from '../hooks';
import { BridgeQuoteItem } from './BridgeQuoteItem';
import clsx from 'clsx';
import { ReactComponent as IconEmptyCC } from '@/ui/assets/empty-cc.svg';
import { QuoteReceiveWrapper } from '../../Swap/Component/ReceiveWrapper';

interface ReceiveDetailsProps {
  payAmount: string;
  payToken: TokenItem;
  receiveToken: TokenItem;
  loading?: boolean;
  activeProvider?: SelectedBridgeQuote;
  bestQuoteId?: {
    bridgeId: string;
    aggregatorId: string;
  };
  openQuotesList: () => void;
}
export const BridgeReceiveDetails = (
  props: ReceiveDetailsProps & InsHTMLAttributes<HTMLDivElement>
) => {
  const { t } = useTranslation();
  const { activeProvider, bestQuoteId, openQuotesList, ...other } = props;

  const isBestQuote = useMemo(
    () =>
      activeProvider?.bridge_id === bestQuoteId?.bridgeId &&
      activeProvider?.aggregator.id === bestQuoteId?.aggregatorId,
    [activeProvider, bestQuoteId]
  );

  if (!activeProvider) {
    return (
      <QuoteReceiveWrapper
        {...other}
        className={clsx(
          other.className,
          isBestQuote && 'bestQuote',
          'empty-quote'
        )}
        onClick={openQuotesList}
      >
        <div className="flex items-center justify-center gap-[8px]">
          <IconEmptyCC
            viewBox="0 0 40 40"
            className="w-[16px] h-[16px] text-r-neutral-foot"
          />
          <div className="text-13 font-normal text-r-neutral-foot">
            {t('page.swap.No-available-quote')}
          </div>
        </div>

        <div
          className={clsx('quote-select', isBestQuote && 'best')}
          onClick={openQuotesList}
        >
          {isBestQuote ? <span>{t('page.swap.best')}</span> : null}
          <IconQuoteSwitchCC
            viewBox="0 0 14 14"
            className={clsx('w-14 h-14')}
          />
        </div>
      </QuoteReceiveWrapper>
    );
  }

  return (
    <QuoteReceiveWrapper
      {...other}
      className={clsx(other.className, isBestQuote && 'bestQuote')}
      onClick={openQuotesList}
    >
      <BridgeQuoteItem
        {...other}
        {...activeProvider}
        sortIncludeGasFee={false}
        bestQuoteUsd={'0'}
        onlyShow
      />
      <div
        className={clsx('quote-select', isBestQuote && 'best')}
        onClick={openQuotesList}
      >
        {isBestQuote ? <span>{t('page.swap.best')}</span> : null}
        <IconQuoteSwitchCC viewBox="0 0 14 14" className={clsx('w-14 h-14')} />
      </div>
    </QuoteReceiveWrapper>
  );
};
