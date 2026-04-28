import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Button, Dropdown, Menu, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import {
  ALL_PERPS_QUOTE_ASSETS,
  PerpsQuoteAsset,
  SPOT_STABLE_COIN_NAME,
  getSpotBalanceKey,
} from '@/ui/views/Perps/constants';
import { QUOTE_ASSET_ICON_MAP as COIN_ICON_MAP } from '@/ui/views/Perps/components/quoteAssetIcons';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import { usePerpsProPosition } from '@/ui/views/DesktopPerps/hooks/usePerpsProPosition';
import { usePerpsSpotMids } from '@/ui/views/Perps/hooks/usePerpsSpotMids';
import { useMemoizedFn } from 'ahooks';
import { RcIconArrowDownCC, RcIconPlusCC } from '@/ui/assets/desktop/common';
import { PERPS_MIN_SWAP_AMOUNT } from '../../Perps/popup/SpotSwapPopup';

export { COIN_ICON_MAP };

const STABLECOIN_SLIPPAGE = 0.01;

interface SpotSwapModalProps {
  visible: boolean;
  /** When provided, locks the target asset (user must swap USDC → targetAsset). */
  targetAsset?: PerpsQuoteAsset;
  /**
   * When provided, seeds `from` to this asset (and pairs it with USDC on the other side).
   * Use when the user clicked a row to "sell their X for USDC".
   * If both sourceAsset and targetAsset are set, targetAsset wins.
   */
  sourceAsset?: PerpsQuoteAsset;
  /** When true, hides the from/to switch UI. */
  disableSwitch?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onDeposit?: () => void;
}

export const SpotSwapModal: React.FC<SpotSwapModalProps> = ({
  visible,
  targetAsset,
  sourceAsset,
  disableSwitch,
  onClose,
  onSuccess,
  onDeposit,
}) => {
  const { t } = useTranslation();
  const { handleStableCoinOrder } = usePerpsProPosition();
  const { spotBalancesMap, getSpotBalance } = usePerpsAccount();
  const [fromCoin, setFromCoin] = useState<PerpsQuoteAsset>('USDC');
  const [toCoin, setToCoin] = useState<PerpsQuoteAsset>('USDT');
  const [amount, setAmount] = useState<string>('');
  const midPrices = usePerpsSpotMids(visible);
  const [submitting, setSubmitting] = useState(false);

  // Snapshot spotBalancesMap so the seed effect doesn't refire on each WS tick (which would
  // wipe the user's typed amount).
  const balancesRef = useRef(spotBalancesMap);
  balancesRef.current = spotBalancesMap;

  useEffect(() => {
    if (!visible) return;
    if (targetAsset) {
      // Explicit target: "I need to get targetAsset" — pair it with USDC as source.
      setFromCoin('USDC');
      setToCoin(targetAsset);
    } else if (sourceAsset) {
      // Explicit source: "I want to sell my sourceAsset" — pair it with USDC as target.
      // When sourceAsset === 'USDC', default target to USDT (free choice entry).
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

  // Raw balance string (BigNumber-safe). Keep numeric cast only for presentation.
  const fromBalanceStr = useMemo(
    () => spotBalancesMap[getSpotBalanceKey(fromCoin)]?.available || '0',
    [fromCoin, spotBalancesMap]
  );
  const fromBalanceBN = useMemo(() => new BigNumber(fromBalanceStr), [
    fromBalanceStr,
  ]);
  const fromBalance = useMemo(() => fromBalanceBN.toNumber(), [fromBalanceBN]);

  const amountBN = useMemo(() => new BigNumber(amount || 0), [amount]);
  const amountNum = useMemo(() => amountBN.toNumber(), [amountBN]);

  // Mid price for current non-USDC leg as BigNumber (1 fallback — safe: limitPx is an
  // upper/lower bound, real fill is matched against the orderbook).
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

  // Amount the user receives on the `to` side (preview only).
  const receiveAmountStr = useMemo(() => {
    if (amountBN.lte(0)) return '0';
    const isBuy = fromCoin === 'USDC';
    const converted = isBuy ? amountBN.dividedBy(midBN) : amountBN.times(midBN);
    return converted.decimalPlaces(4, BigNumber.ROUND_DOWN).toFixed();
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
    if (v !== 'USDC' && toCoin !== 'USDC') {
      setToCoin('USDC');
    }
    if (v === toCoin) {
      setToCoin(v === 'USDC' ? 'USDT' : 'USDC');
    }
  });

  const handleToChange = useMemoizedFn((v: PerpsQuoteAsset) => {
    setToCoin(v);
    if (v !== 'USDC' && fromCoin !== 'USDC') {
      setFromCoin('USDC');
    }
    if (v === fromCoin) {
      setFromCoin(v === 'USDC' ? 'USDT' : 'USDC');
    }
  });

  const handlePercent = useMemoizedFn((pct: number) => {
    if (fromBalanceBN.lte(0)) return;
    const v = fromBalanceBN
      .times(pct)
      .decimalPlaces(2, BigNumber.ROUND_DOWN)
      .toFixed();
    setAmount(v);
  });

  const handleSwap = useMemoizedFn(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const isBuy = fromCoin === 'USDC';
      const nonUsdc = (isBuy ? toCoin : fromCoin) as 'USDT' | 'USDH' | 'USDE';

      let limitPx: string;
      let size: string;
      if (isBuy) {
        limitPx = midBN
          .times(1 + STABLECOIN_SLIPPAGE)
          .decimalPlaces(4)
          .toFixed();
        size = amountBN
          .dividedBy(midBN)
          .decimalPlaces(2, BigNumber.ROUND_DOWN)
          .toFixed();
      } else {
        limitPx = midBN
          .times(1 - STABLECOIN_SLIPPAGE)
          .decimalPlaces(4)
          .toFixed();
        size = amountBN.decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed();
      }

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
    const Icon = COIN_ICON_MAP[coin];
    return (
      <div className="flex items-center text-rb-neutral-title-1 gap-8">
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

  const renderCoinMenu = (
    onSelect: (v: PerpsQuoteAsset) => void,
    selected: PerpsQuoteAsset
  ) => (
    <Menu
      className="bg-r-neutral-bg1 min-w-[180px]"
      onClick={(info) => onSelect(info.key as PerpsQuoteAsset)}
      // selectedKeys={[selected]}
    >
      {sortedCoins.map((c) => {
        const bal = getSpotBalance(c);
        return (
          <Menu.Item
            key={c}
            className="text-rb-neutral-title-1 hover:bg-rb-blue-light-1"
          >
            <div className="flex items-center justify-between gap-12">
              <CoinOption coin={c} />
              <span className="text-rb-neutral-secondary text-[13px]">
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

  const coinSelectBtnClassName = clsx(
    'inline-flex items-center justify-between gap-6',
    'px-10 h-32 rounded-[6px]',
    'border border-solid border-rb-neutral-line',
    'bg-transparent',
    'text-[14px] leading-[16px] font-medium text-rb-neutral-title-1',
    'hover:border-rb-brand-default',
    'disabled:opacity-60 disabled:cursor-not-allowed'
  );

  return (
    <Modal
      visible={visible}
      onCancel={submitting ? undefined : onClose}
      footer={null}
      centered
      width={400}
      closable={!submitting}
      closeIcon={<RcIconCloseCC className="w-14 text-r-neutral-title-1" />}
      bodyStyle={{ padding: 0, height: '520px', maxHeight: '520px' }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      maskClosable={!submitting}
      keyboard={!submitting}
      className="modal-support-darkmode desktop-perps-spot-swap-modal"
    >
      <PopupContainer>
        <div className="bg-rb-neutral-bg-0 h-[520px] flex flex-col relative overflow-hidden">
          <div className="px-20 pt-16 pb-20 flex-1 flex flex-col">
            <h3 className="text-[18px] font-medium text-r-neutral-title-1 text-center mb-20">
              {t('page.perps.PerpsSpotSwap.title')}
            </h3>

            <div className="mb-12 bg-r-neutral-card1 rounded-[12px] px-16 py-14 flex items-center justify-between">
              <span className="text-r-neutral-title-1 text-15 font-medium">
                {t('page.perps.PerpsSpotSwap.to')}
              </span>
              <Dropdown
                transitionName=""
                forceRender
                disabled={!!targetAsset || submitting}
                overlay={renderCoinMenu(handleToChange, toCoin)}
              >
                <button
                  type="button"
                  className={coinSelectBtnClassName}
                  disabled={!!targetAsset || submitting}
                >
                  <CoinOption coin={toCoin} />
                  <RcIconArrowDownCC className="text-rb-neutral-secondary" />
                </button>
              </Dropdown>
            </div>

            <div className="mb-12 bg-r-neutral-card1 rounded-[12px] px-16 pt-14 pb-16">
              <div className="flex justify-between items-center mb-10">
                <span className="text-r-neutral-title-1 text-15 font-medium">
                  {t('page.perps.PerpsSpotSwap.from')}
                </span>
                <div className="flex items-center gap-6">
                  <span className="text-r-neutral-foot text-12">
                    {t('page.perps.PerpsSpotSwap.balance')}:{' '}
                    {fromBalance.toFixed(4)}
                  </span>
                  {onDeposit && (
                    <button
                      type="button"
                      onClick={onDeposit}
                      disabled={submitting}
                      className={clsx(
                        'inline-flex items-center justify-center w-16 h-16 rounded-[4px]',
                        'text-r-blue-default hover:bg-rb-brand-light-1',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                    >
                      <RcIconPlusCC className="w-12 h-12" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-8">
                <Input
                  bordered={false}
                  size="large"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 p-0 text-[28px] leading-[34px] font-medium text-r-neutral-title-1"
                  disabled={submitting}
                />
                <Dropdown
                  transitionName=""
                  forceRender
                  disabled={disableSwitch || submitting}
                  overlay={renderCoinMenu(handleFromChange, fromCoin)}
                >
                  <button
                    type="button"
                    className={coinSelectBtnClassName}
                    disabled={disableSwitch || submitting}
                  >
                    <CoinOption coin={fromCoin} />
                    <RcIconArrowDownCC className="text-rb-neutral-secondary" />
                  </button>
                </Dropdown>
              </div>
            </div>

            <div className="flex gap-8 mb-16">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePercent(p)}
                  className={clsx(
                    'flex-1 h-[36px] rounded-[8px] text-13 font-medium',
                    'bg-r-neutral-card1 border border-solid border-transparent',
                    'text-r-neutral-title-1',
                    'hover:border-rb-brand-default hover:text-rb-brand-default',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                  )}
                  disabled={submitting}
                >
                  {p === 1 ? t('page.perps.PerpsSpotSwap.max') : `${p * 100}%`}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center text-13">
              {errorMessage ? (
                <span className="text-r-red-default">{errorMessage}</span>
              ) : (
                <>
                  <span className="text-r-neutral-foot">
                    {t('page.perps.PerpsSpotSwap.estReceive')}
                  </span>
                  <span className="text-r-neutral-title-1 font-medium">
                    {receiveAmountStr} {toCoin}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1" />

            <Button
              block
              size="large"
              type="primary"
              className="h-[44px] rounded-[8px] text-15 font-medium"
              disabled={!canSubmit}
              loading={submitting}
              onClick={handleSwap}
            >
              {t('page.perps.PerpsSpotSwap.swapBtn')}
            </Button>
          </div>
        </div>
      </PopupContainer>
    </Modal>
  );
};

export default SpotSwapModal;
