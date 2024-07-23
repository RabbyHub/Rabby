import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { InsHTMLAttributes, useMemo } from 'react';
import styled from 'styled-components';

import { ReactComponent as IconQuoteSwitchCC } from '@/ui/assets/swap/switch-cc.svg';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SelectedBridgeQuote } from '../hooks';
import { BridgeQuoteItem } from './BridgeQuoteItem';
import clsx from 'clsx';
import { ReactComponent as IconEmptyCC } from '@/ui/assets/empty-cc.svg';

const ReceiveWrapper = styled.div`
  position: relative;
  margin-top: 24px;
  border: 0.5px solid var(--r-neutral-line, #d3d8e0);
  border-radius: 4px;
  padding: 12px;
  padding-top: 20px;
  height: 84px;

  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;

  &.bestQuote {
    border: 0.5px solid var(--r-green-default, #2abb7f);
  }

  .quote-select {
    position: absolute;
    top: -12px;
    left: 12px;
    height: 20px;
    padding: 4px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 13px;
    cursor: pointer;

    color: var(--r-blue-default, #d3d8e0);
    background: var(--r-blue-light-2);
    border-radius: 4px;
    border: 0.5px solid var(--r-blue-default, #7084ff);
    /* &:hover {
      border: 1px solid var(--r-neutral-line, #d3d8e0);
    } */

    &.best {
      border: 0.5px solid var(--r-green-default, #2abb7f);
      color: var(--r-green-default, #2abb7f);
      background: var(--r-green-light, #d8f2e7);
    }
  }
`;

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
      <ReceiveWrapper
        {...other}
        className={clsx(
          other.className,
          isBestQuote && 'bestQuote',
          'p-0 justify-center items-center'
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
      </ReceiveWrapper>
    );
  }

  return (
    <ReceiveWrapper
      {...other}
      className={clsx(other.className, isBestQuote && 'bestQuote')}
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
    </ReceiveWrapper>
  );
};
