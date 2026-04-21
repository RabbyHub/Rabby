import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import { Button } from 'antd';
import { useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { useHistory, useLocation } from 'react-router-dom';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import {
  getSpotBalanceKey,
  PerpsQuoteAsset,
  SWAP_REQUIRED_QUOTE_ASSETS,
} from '@/ui/views/Perps/constants';
import { SpotSwapModal } from '@/ui/views/DesktopPerps/modal/SpotSwapModal';
import { EnableUnifiedAccountModal } from '@/ui/views/DesktopPerps/modal/EnableUnifiedAccountModal';
import { usePerpsActions } from '@/ui/views/Perps/hooks/usePerpsActions';

interface TradingButtonsProps {
  onBuyClick: () => void;
  onSellClick: () => void;
  buyLoading: boolean;
  sellLoading: boolean;
  buyDisabled: boolean;
  sellDisabled: boolean;
  buyError?: string;
  sellError?: string;
}

export const TradingButtons: React.FC<TradingButtonsProps> = ({
  onBuyClick,
  onSellClick,
  buyLoading,
  sellLoading,
  buyDisabled,
  sellDisabled,
  buyError,
  sellError,
}) => {
  const clearinghouseState = useRabbySelector(
    (store) => store.perps.clearinghouseState
  );
  const wsActiveAssetData = useRabbySelector(
    (store) => store.perps.wsActiveAssetData
  );
  const { accountValue, isUnifiedAccount, spotBalancesMap } = usePerpsAccount();
  const hasPermission = useRabbySelector((state) => state.perps.hasPermission);
  const selectedCoin = useRabbySelector((s) => s.perps.selectedCoin);
  const marketDataMap = useRabbySelector((s) => s.perps.marketDataMap);
  const quoteAsset: PerpsQuoteAsset = (marketDataMap[selectedCoin]
    ?.quoteAsset ?? 'USDC') as PerpsQuoteAsset;
  const currentAssetBalance = Number(
    spotBalancesMap[getSpotBalanceKey(quoteAsset)]?.available || 0
  );
  const needSwapStableCoin = useMemo(() => {
    return (
      SWAP_REQUIRED_QUOTE_ASSETS.includes(quoteAsset) && !currentAssetBalance
    );
  }, [quoteAsset, currentAssetBalance]);
  const [swapVisible, setSwapVisible] = useState(false);
  const [enableVisible, setEnableVisible] = useState(false);
  const { handleEnableUnifiedAccount } = usePerpsActions();
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();

  const {
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const needDepositFirst = useMemo(() => {
    const buyAvailable = Number(wsActiveAssetData?.availableToTrade[0] || 0);
    const sellAvailable = Number(wsActiveAssetData?.availableToTrade[1] || 0);
    return (
      clearinghouseState &&
      accountValue === 0 &&
      buyAvailable === 0 &&
      sellAvailable === 0
    );
  }, [clearinghouseState, wsActiveAssetData?.availableToTrade, accountValue]);

  const handleDepositClick = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'deposit');
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };

  const error = buyError || sellError;

  const [buyHovered, setBuyHovered] = useState(false);
  const [sellHovered, setSellHovered] = useState(false);

  return (
    <div className="flex flex-col gap-[12px]">
      {Boolean(error || needDepositFirst || needSwapStableCoin) && (
        <div className="bg-r-orange-light rounded-[8px] px-[12px] py-[8px] flex items-center gap-[4px]">
          <RcIconInfoCC className="text-r-orange-default" />
          <div className="flex-1 text-left font-medium text-[12px] leading-[14px] text-r-orange-default">
            {needDepositFirst
              ? t('page.perpsPro.tradingPanel.addFundsToGetStarted')
              : needSwapStableCoin
              ? t('page.perps.PerpsSpotSwap.swapBeforeTrading', {
                  quoteAsset,
                })
              : error}
          </div>
        </div>
      )}

      <SpotSwapModal
        visible={swapVisible}
        targetAsset={quoteAsset === 'USDC' ? undefined : quoteAsset}
        disableSwitch={quoteAsset !== 'USDC'}
        onClose={() => setSwapVisible(false)}
      />
      <EnableUnifiedAccountModal
        visible={enableVisible}
        onCancel={() => setEnableVisible(false)}
        onConfirm={async () => {
          const ok = await handleEnableUnifiedAccount();
          if (ok) setSwapVisible(true);
          return ok;
        }}
      />

      {needSwapStableCoin ? (
        <Button
          type="primary"
          block
          size="large"
          onClick={() => setEnableVisible(true)}
          className="w-full h-[40px] rounded-[8px] font-medium text-[13px] border-transparent text-rb-neutral-InvertHighlight"
        >
          {t('page.perps.PerpsDepositCard.swap')}
        </Button>
      ) : needDepositFirst || needEnableTrading ? (
        <Button
          type="primary"
          block
          size="large"
          onClick={() => {
            if (needDepositFirst) {
              handleDepositClick();
            } else {
              handleActionApproveStatus();
            }
          }}
          className="w-full h-[40px] rounded-[8px] font-medium text-[13px] border-transparent text-rb-neutral-InvertHighlight"
        >
          {needDepositFirst
            ? t('page.perpsPro.tradingPanel.deposit')
            : t('page.perpsPro.tradingPanel.enableTrading')}
        </Button>
      ) : (
        <div className="flex items-center gap-[8px]">
          <Button
            type="primary"
            size="large"
            loading={buyLoading}
            onClick={onBuyClick}
            disabled={buyDisabled || !hasPermission}
            style={{
              boxShadow:
                buyHovered && !buyDisabled && !buyError
                  ? '0px 8px 16px rgba(42, 187, 127, 0.3)'
                  : 'none',
            }}
            onMouseEnter={() => setBuyHovered(true)}
            onMouseLeave={() => setBuyHovered(false)}
            className={clsx(
              'flex-1 h-[40px] rounded-[8px] font-medium text-[13px] border-transparent',
              'bg-rb-green-default text-rb-neutral-InvertHighlight',
              (buyDisabled || buyError || !hasPermission) &&
                'cursor-not-allowed'
            )}
          >
            {t('page.perpsPro.tradingPanel.buyLong')}
          </Button>

          <Button
            type="primary"
            size="large"
            loading={sellLoading}
            onClick={onSellClick}
            disabled={sellDisabled || !hasPermission}
            style={{
              boxShadow:
                sellHovered && !sellDisabled && !sellError
                  ? '0px 8px 16px rgba(227, 73, 53, 0.3)'
                  : 'none',
            }}
            onMouseEnter={() => setSellHovered(true)}
            onMouseLeave={() => setSellHovered(false)}
            className={clsx(
              'flex-1 h-[40px] rounded-[8px] font-medium text-[13px] border-transparent',
              'bg-rb-red-default text-rb-neutral-InvertHighlight',
              (sellDisabled || sellError || !hasPermission) &&
                'cursor-not-allowed'
            )}
          >
            {t('page.perpsPro.tradingPanel.sellShort')}
          </Button>
        </div>
      )}
    </div>
  );
};
