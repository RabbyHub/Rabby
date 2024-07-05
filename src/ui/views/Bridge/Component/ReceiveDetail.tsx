import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { InsHTMLAttributes } from 'react';
import styled from 'styled-components';

import ImgSwitch from '@/ui/assets/swap/switch.svg';

import React from 'react';
import { useSetQuoteVisible } from '../hooks';
import { useTranslation } from 'react-i18next';
import { SelectedBridgeQuote } from '../../Bridge/hooks';
import { BridgeQuoteItem } from '../../Bridge/Component/QuoteItem';

const ReceiveWrapper = styled.div`
  position: relative;
  margin-top: 24px;
  border: 0.5px solid var(--r-neutral-line, #d3d8e0);
  border: 1px solid var(--r-neutral-line, #d3d8e0);
  border-radius: 4px;
  padding: 12px;
  padding-top: 16px;

  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;
  .receive-token {
    font-size: 15px;
    color: #13141a;
  }

  .diffPercent {
    &.negative {
      color: var(--r-red-default, #e34935);
    }
    &.positive {
      color: var(--r-green-default, #2abb7f);
    }
  }
  .column {
    display: flex;
    justify-content: space-between;

    .right {
      font-weight: medium;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      .ellipsis {
        max-width: 170px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      img {
        width: 14px;
        height: 14px;
      }
    }
  }

  .warning {
    margin-bottom: 8px;
    padding: 8px;
    font-weight: 400;
    font-size: 13px;
    color: #ffb020;
    position: relative;
    background: rgba(255, 176, 32, 0.1);
    border-radius: 4px;
  }

  .footer {
    position: relative;
    border-top: 0.5px solid var(--r-neutral-line, #d3d8e0);
    padding-top: 8px;

    .rate {
      color: var(--r-neutral-body, #d3d8e0) !important;
    }
  }
  .quote-provider {
    position: absolute;
    top: -12px;
    left: 12px;
    height: 20px;
    padding: 4px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    cursor: pointer;

    color: var(--r-neutral-body, #d3d8e0);
    background: var(--r-blue-light-2);
    border-radius: 4px;
    border: 1px solid transparent;
    &:hover {
      /* background: var(--r-neutral-bg-1, #fff); */
      border: 1px solid var(--r-neutral-line, #d3d8e0);
    }
  }
`;

interface ReceiveDetailsProps {
  payAmount: string;
  // receiveRawAmount: string | number;
  payToken: TokenItem;
  receiveToken: TokenItem;
  // receiveTokenDecimals?: number;
  // quoteWarning?: [string, string];
  loading?: boolean;
  activeProvider: SelectedBridgeQuote;
  // isWrapToken?: boolean;
}
export const ReceiveDetails = (
  props: ReceiveDetailsProps & InsHTMLAttributes<HTMLDivElement>
) => {
  const { t } = useTranslation();
  const { activeProvider, ...other } = props;

  const openQuote = useSetQuoteVisible();
  // const payTokenSymbol = getTokenSymbol(props.payToken);
  // const receiveTokenSymbol = getTokenSymbol(props.receiveToken);

  return (
    <ReceiveWrapper {...other}>
      <BridgeQuoteItem
        {...other}
        {...activeProvider}
        sortIncludeGasFee={false}
        bestQuoteUsd={'0'}
        onlyShow
      />
      <div
        className="quote-provider"
        onClick={() => {
          openQuote(true);
        }}
      >
        <img src={ImgSwitch} className="w-12 h-12" />
      </div>
    </ReceiveWrapper>
  );
};
