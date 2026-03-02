import React, { useCallback } from 'react';
import { TCell, TRow } from './components/Table';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import clsx from 'clsx';
import IconUnknown from '@/ui/assets/token-default.svg';
import { Image } from 'antd';
import { isNil } from 'lodash';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { isLpToken } from '@/ui/utils/portfolio/lpToken';
import { LpTokenTag } from '../../DesktopProfile/components/TokensTabPane/components/LpTokenTag';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCommonPopupView } from '@/ui/utils';
import { RcIconSwapCC, RcIconSendCC } from 'ui/assets/dashboard/panel';

export interface Props {
  item: AbstractPortfolioToken;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const LpContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  .inner-symbol {
    max-width: calc(100% - 24px);
  }
`;

const StyledTRow = styled(TRow)`
  &:hover {
    box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.04);
  }
`;

const ActionBtnWrapper = styled.div`
  position: relative;

  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    top: 0;
    bottom: 0;
    left: -10px;
    right: -42px;
    height: 24px;
    /*background: linear-gradient(
      to right,
      transparent 0%,
      var(--rabby-gradient-fade, rgba(255, 255, 255, 1)) 100%
    );*/
    pointer-events: none;
  }
`;

const ActionBtn = styled.div`
  height: 24px;
  min-width: 64px;

  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  cursor: pointer;
  color: var(--r-neutral-title-1, #13141a);
  background: var(--r-neutral-bg-2, #f5f6fa);

  flex-shrink: 0;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;

  & > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  & > svg,
  & > *:not(span) {
    flex-shrink: 0;
  }

  &:hover {
    color: var(--r-blue-default, #7084ff);
  }
`;

const TokenItemAsset: React.FC<Props> = ({ item }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const chain = findChain({
    serverId: item.chain,
  });
  const tokenId = item._tokenId || item.id;

  const { setVisible } = useCommonPopupView();

  const gotoSwap = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setVisible(false);
      history.push(
        `/dex-swap?rbisource=assetlist&chain=${item.chain}&payTokenId=${tokenId}`
      );
    },
    [history, item.chain, tokenId]
  );

  const gotoSend = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setVisible(false);
      history.push(
        `/send-token?rbisource=assetlist&token=${item.chain}:${tokenId}`
      );
    },
    [history, item.chain, tokenId]
  );

  return (
    <TCell className="py-8 flex gap-10 w-[146px] items-center flex-shrink-0">
      <div className="relative h-[32px]">
        <Image
          className="w-32 h-32 rounded-full"
          src={item.logo_url || IconUnknown}
          alt={item.symbol}
          fallback={IconUnknown}
          preview={false}
        />
        <TooltipWithMagnetArrow
          title={chain?.name}
          className="rectangle w-[max-content]"
        >
          <img
            className="w-16 h-16 absolute right-[-2px] bottom-[-2px] rounded-full"
            src={chain?.logo || IconUnknown}
            alt={item.chain}
          />
        </TooltipWithMagnetArrow>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden group-hover:overflow-visible min-w-0">
        <div className="group-hover:hidden flex flex-col gap-2 overflow-hidden">
          <LpContainer>
            <span className="text-r-neutral-title-1 font-medium text-15 leading-[15px] whitespace-nowrap overflow-ellipsis overflow-hidden inner-symbol">
              {item.symbol}
            </span>
            {isLpToken(item) && (
              <LpTokenTag
                size={13.5}
                inModal
                iconClassName="text-r-neutral-foot"
                protocolName={item.protocol_id || ''}
              />
            )}
          </LpContainer>
          <span className="text-r-neutral-foot text-13 leading-[14px] truncate whitespace-nowrap overflow-ellipsis overflow-hidden">
            {item._amountStr}
          </span>
        </div>
        <ActionBtnWrapper className="hidden group-hover:flex flex-row gap-8 items-center flex-nowrap">
          <ActionBtn onClick={gotoSwap} className="active:bg-rb-brand-light-1">
            <RcIconSwapCC width={12} height={12} />
            <span>{t('page.dashboard.tokenDetail.swap')}</span>
          </ActionBtn>
          <ActionBtn onClick={gotoSend} className="active:bg-rb-brand-light-1">
            <RcIconSendCC width={12} height={12} />
            <span>{t('page.dashboard.tokenDetail.send')}</span>
          </ActionBtn>
        </ActionBtnWrapper>
      </div>
    </TCell>
  );
};

const TokenItemPrice: React.FC<Props> = ({ item }) => {
  return (
    <TCell
      className={clsx(
        'py-8 text-r-neutral-title1 text-13 w-[90px]',
        'flex flex-col gap-2'
      )}
    >
      <div>${item._priceStr}</div>
      {isNil(item.price_24h_change) ? (
        <span className="text-r-neutral-foot text-13 font-normal leading-[14px]">
          (0%)
        </span>
      ) : (
        <div
          className={clsx('font-normal text-12', {
            'text-green': item.price_24h_change > 0,
            'text-red-forbidden': item.price_24h_change < 0,
          })}
        >
          ({item.price_24h_change > 0 ? '+' : ''}
          {(item.price_24h_change * 100).toFixed(2)}%)
        </div>
      )}
    </TCell>
  );
};

const TokenItemUSDValue: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title-1 text-13 font-medium text-right w-[110px] truncate">
      {item._usdValueStr || '<$0.01'}
    </TCell>
  );
};

const TokenItemMarketInfo: React.FC<Props> = ({ item }) => {
  return (
    <TCell className={clsx('flex flex-col gap-2')}>
      <div className="text-r-neutral-title-1 font-medium text-15 leading-[15px] text-right truncate">
        {item._usdValueStr || '<$0.01'}
      </div>
      <div className="flex flex-row gap-4 items-center justify-end">
        <div className="text-r-neutral-foot text-13 leading-[14px]">
          ${item._priceStr}
        </div>
        {isNil(item.price_24h_change) ? (
          <span className="text-r-neutral-foot text-13 font-normal leading-[14px]">
            (0%)
          </span>
        ) : (
          <div
            className={clsx('font-normal text-13 leading-[14px]', {
              'text-green': item.price_24h_change > 0,
              'text-red-forbidden': item.price_24h_change < 0,
            })}
          >
            ({item.price_24h_change > 0 ? '+' : ''}
            {(item.price_24h_change * 100).toFixed(2)}%)
          </div>
        )}
      </div>
    </TCell>
  );
};

export const TokenItem: React.FC<Props> = ({ item, style, onClick }) => {
  return (
    <StyledTRow
      onClick={onClick}
      style={style}
      className={clsx(
        'group cursor-pointer',
        'h-[60px] mt-8 pl-12 pr-16 justify-between',
        'rounded-[8px] border border-transparent bg-r-neutral-card1',
        'hover:border-blue-light active:bg-blue-light active:bg-opacity-10'
      )}
    >
      <TokenItemAsset item={item} />
      <TokenItemMarketInfo item={item} />
    </StyledTRow>
  );
};
