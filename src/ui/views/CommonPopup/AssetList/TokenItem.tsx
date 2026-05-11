import React, { useCallback, useState } from 'react';
import { TCell, TRow } from './components/Table';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import clsx from 'clsx';
import IconUnknown from '@/ui/assets/token-default.svg';
import { Image } from 'antd';
import { isNumber } from 'lodash';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { isLpToken, isUnknownToken } from '@/ui/utils/portfolio/lpToken';
import { LpTokenTag } from '../../DesktopProfile/components/TokensTabPane/components/LpTokenTag';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCommonPopupView } from '@/ui/utils';
import {
  RcIconSwapCC,
  RcIconSendCC,
  RcIconSwapWhiteCC,
  RcIconSendWhiteCC,
} from 'ui/assets/dashboard/panel';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { UnknownTag } from '@/ui/component';

export interface Props {
  item: AbstractPortfolioToken;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export interface TokenItemAssetProps extends Props {
  showButtons: boolean;
}

const LpContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  .inner-symbol {
    max-width: 140px;
  }
`;

const ActionBtnWrapper = styled.div<{ isDark?: boolean }>`
  position: relative;
  width: min-content;

  &::after {
    content: '';
    position: absolute;
    z-index: 0;
    top: -8px;
    bottom: -8px;
    width: 28px;
    right: -8px;
    height: 44px;
    background: ${({ isDark }) =>
      isDark
        ? 'linear-gradient(90deg, rgba(27, 29, 44, 1) 0%, rgba(27, 29, 44, 0) 100%)'
        : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 1) 100%)'};
    pointer-events: none;
  }
`;

const StyledTRow = styled(TRow)`
  &:hover {
    box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.04);
  }
  &:active:not(:has(.token-action-btn:active)) {
    background-color: var(--r-blue-light1, #edf0ff) !important;
    ${ActionBtnWrapper}::after {
      display: none;
    }
  }
`;

const ActionBtn = styled.div`
  height: 28px;
  padding-left: 8px;
  padding-right: 8px;

  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;

  cursor: pointer;
  color: var(--r-neutral-title-1, #13141a);
  background: var(--r-neutral-bg-2, #f5f6fa);
  z-index: 11;
  flex-shrink: 0;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;

  & > span {
    white-space: nowrap;
  }

  & > svg,
  & > *:not(span) {
    flex-shrink: 0;
  }

  &:hover {
    color: var(--r-blue-default, #7084ff);
  }
`;

const TokenItemAsset: React.FC<TokenItemAssetProps> = ({
  item,
  showButtons,
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { isDarkTheme } = useThemeMode();
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
    <TCell className="py-8 flex gap-10 items-center flex-shrink-1 flex-1">
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
      <div
        className={clsx(
          'flex flex-1 flex-col gap-2 min-w-0',
          showButtons ? 'overflow-visible' : 'overflow-hidden'
        )}
      >
        <div
          className={clsx(
            'flex flex-col gap-2 overflow-hidden',
            showButtons && 'hidden'
          )}
        >
          <LpContainer>
            <span className="text-r-neutral-title-1 font-medium text-15 leading-[18px] whitespace-nowrap overflow-ellipsis overflow-hidden inner-symbol">
              {item.symbol}
            </span>
            {isUnknownToken(item) && <UnknownTag className="ml-2" />}
            {isLpToken(item) && (
              <span className="inline-flex">
                <LpTokenTag
                  size={13.5}
                  inModal
                  iconClassName="text-r-neutral-foot"
                  protocolName={item.protocol_id || ''}
                />
              </span>
            )}
          </LpContainer>
          <span className="text-r-neutral-foot text-13 leading-[16px] truncate whitespace-nowrap overflow-ellipsis overflow-hidden">
            {item._amountStr}
          </span>
        </div>
        <ActionBtnWrapper
          isDark={isDarkTheme}
          className={clsx(
            'flex flex-row gap-8 items-center flex-nowrap',
            !showButtons && 'hidden'
          )}
        >
          <ActionBtn
            onClick={gotoSwap}
            className="token-action-btn active:bg-rb-brand-light-1"
          >
            {isDarkTheme ? (
              <RcIconSwapWhiteCC width={12} height={12} />
            ) : (
              <RcIconSwapCC width={12} height={12} />
            )}
            <span>{t('page.dashboard.tokenDetail.swap')}</span>
          </ActionBtn>
          <ActionBtn
            onClick={gotoSend}
            className="token-action-btn active:bg-rb-brand-light-1"
          >
            {isDarkTheme ? (
              <RcIconSendWhiteCC width={12} height={12} />
            ) : (
              <RcIconSendCC width={12} height={12} />
            )}
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
      {isNumber(item.price_24h_change) && (
        <div
          className={clsx('font-normal text-12 text-r-neutral-foot', {
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
      <div className="text-r-neutral-title-1 font-medium text-15 leading-[18px] text-right truncate">
        {item._usdValueStr || '<$0.01'}
      </div>
      <div className="flex flex-row gap-4 items-center justify-end">
        <div className="text-r-neutral-foot text-13 leading-[16px]">
          ${item._priceStr}
        </div>
        {isNumber(item.price_24h_change) && (
          <div
            className={clsx(
              'font-normal text-13 leading-[16px] text-r-neutral-foot',
              {
                'text-green': item.price_24h_change > 0,
                'text-red-forbidden': item.price_24h_change < 0,
              }
            )}
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
  const [showButtons, setShowButtons] = useState(false);
  const handleRowMouseEnter = useCallback(() => {
    setShowButtons(true);
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    setShowButtons(false);
  }, []);

  return (
    <StyledTRow
      onClick={onClick}
      style={style}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
      className={clsx(
        'group cursor-pointer',
        'h-[60px] mt-8 px-12 justify-between',
        'rounded-[8px] border border-transparent bg-r-neutral-card1',
        'hover:border-blue-light active:bg-opacity-10'
      )}
    >
      <TokenItemAsset item={item} showButtons={showButtons} />
      <TokenItemMarketInfo item={item} />
    </StyledTRow>
  );
};
