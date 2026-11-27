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
import { cn } from '@/ui/utils/cn';
import styles from './TokenItem.module.css';

export interface Props {
  item: AbstractPortfolioToken;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export interface TokenItemAssetProps extends Props {
  showButtons: boolean;
}

const ActionBtn = ({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-none justify-center items-center gap-4 h-28 px-8',
      'text-[12px] font-medium rounded-[6px] cursor-pointer z-[11]',
      'text-r-neutral-title-1 bg-r-neutral-bg-2 hover:text-r-blue-default',
      className
    )}
    {...rest}
  />
);

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
    [history, item.chain, tokenId, setVisible]
  );

  const gotoSend = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setVisible(false);
      history.push(
        `/send-token?rbisource=assetlist&token=${item.chain}:${tokenId}`
      );
    },
    [history, item.chain, tokenId, setVisible]
  );

  return (
    <TCell className="py-8 flex gap-10 items-center shrink-1 flex-1">
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
          <div className="flex items-center gap-2">
            <span className="text-r-neutral-title-1 font-medium text-15 leading-[18px] whitespace-nowrap text-ellipsis overflow-hidden inner-symbol max-w-[140px]">
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
          </div>
          <span className="text-r-neutral-foot text-13 leading-[16px] truncate whitespace-nowrap text-ellipsis overflow-hidden max-w-[180px]">
            {item._amountStr}
          </span>
        </div>
        <div
          className={clsx(
            styles.actionBtnWrapper,
            isDarkTheme && styles.actionBtnWrapperDark,
            'flex flex-row gap-8 items-center flex-nowrap',
            !showButtons && 'hidden'
          )}
        >
          <ActionBtn
            onClick={gotoSwap}
            className="token-action-btn active:bg-rb-brand-light-1"
          >
            {isDarkTheme ? (
              <RcIconSwapWhiteCC width={12} height={12} className="shrink-0" />
            ) : (
              <RcIconSwapCC width={12} height={12} className="shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {t('page.dashboard.tokenDetail.swap')}
            </span>
          </ActionBtn>
          <ActionBtn
            onClick={gotoSend}
            className="token-action-btn active:bg-rb-brand-light-1"
          >
            {isDarkTheme ? (
              <RcIconSendWhiteCC width={12} height={12} className="shrink-0" />
            ) : (
              <RcIconSendCC width={12} height={12} className="shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {t('page.dashboard.tokenDetail.send')}
            </span>
          </ActionBtn>
        </div>
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
            'text-r-green-default': item.price_24h_change > 0,
            'text-r-red-default': item.price_24h_change < 0,
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
            className={clsx('font-normal text-13 leading-[16px]', {
              'text-r-green-default': item.price_24h_change > 0,
              'text-r-red-default': item.price_24h_change < 0,
              'text-r-neutral-foot': !item.price_24h_change,
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
  const [showButtons, setShowButtons] = useState(false);
  const handleRowMouseEnter = useCallback(() => {
    setShowButtons(true);
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    setShowButtons(false);
  }, []);

  return (
    <TRow
      onClick={onClick}
      style={style}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
      className={clsx(
        styles.row,
        'group cursor-pointer',
        'h-[60px] mt-8 px-12 justify-between',
        'rounded-[8px] border border-transparent',
        'hover:border-r-blue-default'
      )}
    >
      <TokenItemAsset item={item} showButtons={showButtons} />
      <TokenItemMarketInfo item={item} />
    </TRow>
  );
};
