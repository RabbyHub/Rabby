import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Menu, message } from 'antd';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { ReactComponent as RcIconArrowDownCC } from '@/ui/assets/arrow-down-cc.svg';
import { ReactComponent as RcIconAddDeposit } from '@/ui/assets/perps/IconAddDeposit.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import {
  ALL_PERPS_QUOTE_ASSETS,
  PerpsQuoteAsset,
  SPOT_STABLE_COIN_NAME,
  getSpotBalanceKey,
} from '../constants';
import { QUOTE_ASSET_ICON_MAP } from '../components/quoteAssetIcons';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import { usePerpsSpotMids } from '../hooks/usePerpsSpotMids';
import { usePerpsPosition } from '../hooks/usePerpsPosition';

const STABLECOIN_SLIPPAGE = 0.01;
export const PERPS_MIN_SWAP_AMOUNT = 15;

interface SpotSwapContentProps {
  visible: boolean;
  targetAsset?: PerpsQuoteAsset;
  sourceAsset?: PerpsQuoteAsset;
  disableSwitch?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onDeposit?: () => void;
}

const Content: React.FC<SpotSwapContentProps> = ({
  visible,
  targetAsset,
  sourceAsset,
  disableSwitch,
  onClose,
  onSuccess,
  onDeposit,
}) => {
  const { t } = useTranslation();
  const { spotBalancesMap, getSpotBalance } = usePerpsAccount();
  const { handleStableCoinOrder } = usePerpsPosition();
  const midPrices = usePerpsSpotMids(visible);

  const [fromCoin, setFromCoin] = useState<PerpsQuoteAsset>('USDC');
  const [toCoin, setToCoin] = useState<PerpsQuoteAsset>('USDT');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Snapshot balances so the seed effect doesn't refire on each WS tick (which
  // would wipe the user's typed amount).
  const balancesRef = useRef(spotBalancesMap);
  balancesRef.current = spotBalancesMap;

  useEffect(() => {
    if (!visible) return;
    if (targetAsset) {
      setFromCoin('USDC');
      setToCoin(targetAsset);
    } else if (sourceAsset) {
      setFromCoin(sourceAsset);
      setToCoin(sourceAsset === 'USDC' ? 'USDT' : 'USDC');
    } else {
      const sorted = ALL_PERPS_QUOTE_ASSETS.map((c) => ({
        coin: c,
        bal: Number(balancesRef.current[getSpotBalanceKey(c)]?.available || 0),
      }))
        .filter((i) => i.bal > 0)
        .sort((a, b) => b.bal - a.bal);
      if (sorted.length === 0) {
        setFromCoin('USDC');
        setToCoin('USDT');
      } else {
        setFromCoin(sorted[0].coin);
        setToCoin(
          sorted.find((i) => i.coin !== sorted[0].coin)?.coin ||
            (sorted[0].coin === 'USDC' ? 'USDT' : 'USDC')
        );
      }
    }
    setAmount('');
  }, [visible, targetAsset, sourceAsset]);

  const fromBalanceStr = useMemo(
    () => spotBalancesMap[getSpotBalanceKey(fromCoin)]?.available || '0',
    [fromCoin, spotBalancesMap]
  );
  const fromBalanceBN = useMemo(() => new BigNumber(fromBalanceStr), [
    fromBalanceStr,
  ]);

  const amountBN = useMemo(() => new BigNumber(amount || 0), [amount]);

  // Mid price for current non-USDC leg as BigNumber (1 fallback — safe: limitPx
  // is an upper/lower bound, real fill is matched against the orderbook).
  const midBN = useMemo(() => {
    if (fromCoin === toCoin) return new BigNumber(1);
    const nonUsdc = fromCoin === 'USDC' ? toCoin : fromCoin;
    if (nonUsdc === 'USDC') return new BigNumber(1);
    const spotName =
      SPOT_STABLE_COIN_NAME[nonUsdc as Exclude<PerpsQuoteAsset, 'USDC'>];
    const raw = midPrices[spotName] || midPrices[nonUsdc] || '1';
    const n = new BigNumber(raw);
    return n.isFinite() && n.gt(0) ? n : new BigNumber(1);
  }, [fromCoin, toCoin, midPrices]);

  const receiveAmountStr = useMemo(() => {
    if (amountBN.lte(0)) return '0';
    const isBuy = fromCoin === 'USDC';
    const converted = isBuy ? amountBN.dividedBy(midBN) : amountBN.times(midBN);
    return converted.decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed();
  }, [amountBN, midBN, fromCoin]);

  const errorMessage = useMemo(() => {
    if (!amount) return '';
    if (amountBN.lt(PERPS_MIN_SWAP_AMOUNT))
      return t('page.perps.PerpsSpotSwap.minimumAmount');
    if (amountBN.gt(fromBalanceBN))
      return t('page.perps.PerpsSpotSwap.insufficientBalance');
    return '';
  }, [amount, amountBN, fromBalanceBN, t]);

  // SDK stableCoinOrder supports only X ↔ USDC pairs.
  const invalidPair = useMemo(() => {
    if (fromCoin === toCoin) return true;
    if (fromCoin !== 'USDC' && toCoin !== 'USDC') return true;
    return false;
  }, [fromCoin, toCoin]);

  const canSubmit =
    !invalidPair && !errorMessage && amountBN.gt(0) && !submitting;

  const handleFromChange = useMemoizedFn((v: PerpsQuoteAsset) => {
    setFromCoin(v);
    if (v !== 'USDC' && toCoin !== 'USDC') setToCoin('USDC');
    if (v === toCoin) setToCoin(v === 'USDC' ? 'USDT' : 'USDC');
  });

  const handleToChange = useMemoizedFn((v: PerpsQuoteAsset) => {
    setToCoin(v);
    if (v !== 'USDC' && fromCoin !== 'USDC') setFromCoin('USDC');
    if (v === fromCoin) setFromCoin(v === 'USDC' ? 'USDT' : 'USDC');
  });

  const handlePercent = useMemoizedFn((pct: number) => {
    if (fromBalanceBN.lte(0)) return;
    setAmount(
      fromBalanceBN.times(pct).decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed()
    );
  });

  const handleSwap = useMemoizedFn(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const isBuy = fromCoin === 'USDC';
      const nonUsdc = (isBuy ? toCoin : fromCoin) as 'USDT' | 'USDH' | 'USDE';
      const limitPx = isBuy
        ? midBN
            .times(1 + STABLECOIN_SLIPPAGE)
            .decimalPlaces(4)
            .toFixed()
        : midBN
            .times(1 - STABLECOIN_SLIPPAGE)
            .decimalPlaces(4)
            .toFixed();
      const size = isBuy
        ? amountBN
            .dividedBy(midBN)
            .decimalPlaces(2, BigNumber.ROUND_DOWN)
            .toFixed()
        : amountBN.decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed();

      const ok = await handleStableCoinOrder({
        coin: nonUsdc,
        isBuy,
        size,
        limitPx,
      });
      if (ok) {
        message.success(t('page.perps.PerpsSpotSwap.swapSuccess'));
        onSuccess?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  });

  const CoinOption = ({ coin }: { coin: PerpsQuoteAsset }) => {
    const Icon = QUOTE_ASSET_ICON_MAP[coin];
    return (
      <div className="flex items-center gap-8 text-r-neutral-title-1">
        <Icon className="w-16 h-16" />
        <span>{coin}</span>
      </div>
    );
  };

  const sortedCoins = useMemo(() => {
    return [...ALL_PERPS_QUOTE_ASSETS].sort(
      (a, b) => getSpotBalance(b) - getSpotBalance(a)
    );
  }, [getSpotBalance, spotBalancesMap]);

  const renderCoinMenu = (onSelect: (v: PerpsQuoteAsset) => void) => (
    <Menu
      className="bg-r-neutral-bg-1 min-w-[180px]"
      onClick={(info) => onSelect(info.key as PerpsQuoteAsset)}
    >
      {sortedCoins.map((c) => {
        const bal = getSpotBalance(c);
        return (
          <Menu.Item
            key={c}
            className="text-r-neutral-title-1 hover:bg-r-blue-light-1"
          >
            <div className="flex items-center justify-between gap-12">
              <CoinOption coin={c} />
              <span className="text-r-neutral-foot text-13">
                {new BigNumber(bal)
                  .decimalPlaces(2, BigNumber.ROUND_DOWN)
                  .toFixed()}
              </span>
            </div>
          </Menu.Item>
        );
      })}
    </Menu>
  );

  const coinPillClassName = clsx(
    'inline-flex items-center gap-6 px-12 h-[36px] rounded-[8px]',
    'border border-solid border-rabby-neutral-line bg-transparent',
    'text-15 font-medium text-r-neutral-title-1',
    'hover:border-r-blue-default disabled:cursor-default'
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-r-neutral-bg2 rounded-t-[16px]">
      <div className="flex items-center justify-center px-20 pt-20 pb-12">
        <div className="text-20 font-medium text-r-neutral-title-1">
          {t('page.perps.PerpsSpotSwap.title')}
        </div>
      </div>

      {/* Swap To */}
      <div className="mx-20 mb-12 bg-r-neutral-card1 rounded-[12px] px-16 py-14 flex items-center justify-between">
        <span className="text-r-neutral-title-1 text-15 font-medium">
          {t('page.perps.PerpsSpotSwap.to')}
        </span>
        <Dropdown
          transitionName=""
          forceRender
          disabled={!!targetAsset || submitting}
          overlay={renderCoinMenu(handleToChange)}
        >
          <button
            type="button"
            disabled={!!targetAsset || submitting}
            className={coinPillClassName}
          >
            <CoinOption coin={toCoin} />
            {!targetAsset && (
              <RcIconArrowDownCC className="w-[12px] h-[12px] text-r-neutral-foot" />
            )}
          </button>
        </Dropdown>
      </div>

      {/* From */}
      <div className="mx-20 mb-12 bg-r-neutral-card1 rounded-[12px] px-16 pt-14 pb-16">
        <div className="flex justify-between items-center mb-10">
          <span className="text-r-neutral-title-1 text-15 font-medium">
            {t('page.perps.PerpsSpotSwap.from')}
          </span>
          <div className="flex items-center gap-6">
            <span className="text-r-neutral-foot text-12">
              {t('page.perps.PerpsSpotSwap.balance')}:{' '}
              {fromBalanceBN.toFixed(4)}
            </span>
            {onDeposit && (
              <button
                type="button"
                onClick={onDeposit}
                disabled={submitting}
                className={clsx(
                  'inline-flex items-center justify-center w-[16px] h-[16px] rounded-[4px]'
                )}
              >
                <RcIconAddDeposit className="w-[14px] h-[14px]" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-8">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0"
            disabled={submitting}
            className={clsx(
              'flex-1 min-w-0 w-full p-0',
              'text-[28px] leading-[34px] font-medium text-r-neutral-title-1',
              'bg-transparent border-none outline-none focus:outline-none'
            )}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
            }}
          />
          <Dropdown
            transitionName=""
            forceRender
            disabled={disableSwitch || submitting}
            overlay={renderCoinMenu(handleFromChange)}
          >
            <button
              type="button"
              disabled={disableSwitch || submitting}
              className={coinPillClassName}
            >
              <CoinOption coin={fromCoin} />
              {!disableSwitch && (
                <RcIconArrowDownCC className="w-[12px] h-[12px] text-r-neutral-foot" />
              )}
            </button>
          </Dropdown>
        </div>
      </div>

      {/* Percent shortcuts */}
      <div className="mx-20 flex gap-8 mb-12">
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <div
            key={p}
            onClick={() => handlePercent(p)}
            className={clsx(
              'flex-1 h-[36px] flex items-center justify-center rounded-[8px]',
              'bg-r-neutral-card1 border border-solid border-transparent',
              'text-13 font-medium text-r-neutral-title-1 cursor-pointer',
              'hover:border-rabby-blue-default hover:text-r-blue-default'
            )}
          >
            {p === 1 ? t('page.perps.PerpsSpotSwap.max') : `${p * 100}%`}
          </div>
        ))}
      </div>

      {/* Receive preview / error */}
      <div className="mx-20 mb-12 flex items-center text-12">
        {errorMessage ? (
          <span className="text-r-red-default">{errorMessage}</span>
        ) : (
          <span className="text-r-neutral-foot inline-flex items-center gap-4">
            {t('page.perps.PerpsSpotSwap.estReceive')}:{receiveAmountStr}{' '}
            {toCoin}
            <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[max-content]"
              placement="top"
              title={t('page.perps.PerpsSpotSwap.estReceiveTooltip')}
            >
              <RcIconInfo className="text-r-neutral-foot relative" />
            </TooltipWithMagnetArrow>
          </span>
        )}
      </div>

      <div className="mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line">
        <Button
          block
          size="large"
          type="primary"
          disabled={!canSubmit}
          loading={submitting}
          onClick={handleSwap}
          className="h-[48px] text-15 font-medium rounded-[8px]"
        >
          {t('page.perps.PerpsSpotSwap.swapBtn')}
        </Button>
      </div>
    </div>
  );
};

export const SpotSwapPopup = (
  props: PopupProps & {
    targetAsset?: PerpsQuoteAsset;
    sourceAsset?: PerpsQuoteAsset;
    disableSwitch?: boolean;
    onSuccess?: () => void;
    onDeposit?: () => void;
  }
) => {
  const {
    targetAsset,
    sourceAsset,
    disableSwitch,
    onSuccess,
    onDeposit,
    ...rest
  } = props;
  return (
    <Popup
      placement="bottom"
      height={450}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      {...rest}
    >
      <Content
        visible={!!props.visible}
        targetAsset={targetAsset}
        sourceAsset={sourceAsset}
        disableSwitch={disableSwitch}
        onClose={() => props.onCancel?.()}
        onSuccess={onSuccess}
        onDeposit={onDeposit}
      />
    </Popup>
  );
};

export default SpotSwapPopup;
