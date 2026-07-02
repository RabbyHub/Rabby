import React from 'react';
import { Modal, Button } from 'antd';
import { ThousandsInput } from '../components/ThousandsInput';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import clsx from 'clsx';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import {
  PopupContainer,
  usePopupContainer,
} from '@/ui/hooks/usePopupContainer';
import { Popup } from '@/ui/component';
import { PerpsQuoteAsset } from '@/ui/views/Perps/constants';
import { QUOTE_ASSET_ICON_MAP as COIN_ICON_MAP } from '@/ui/views/Perps/components/quoteAssetIcons';
import { ReactComponent as RcIconAddDeposit } from '@/ui/assets/perps/IconAddDeposit.svg';
import { usePerpsProPosition } from '@/ui/views/DesktopPerps/hooks/usePerpsProPosition';
import { useStableCoinSwap } from '@/ui/views/Perps/hooks/useStableCoinSwap';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
export { COIN_ICON_MAP };

interface SpotSwapModalProps {
  visible: boolean;
  /** Pre-fills the `to` side. Soft seed only — set `disableSwitch` to also lock it. */
  targetAsset?: PerpsQuoteAsset;
  /**
   * When provided, seeds `from` to this asset (and pairs it with USDC on the other side).
   * Use when the user clicked a row to "sell their X for USDC".
   * If both sourceAsset and targetAsset are set, targetAsset wins.
   */
  sourceAsset?: PerpsQuoteAsset;
  /** When true, locks BOTH from and to dropdowns and hides their dropdown arrows. */
  disableSwitch?: boolean;
  /** Stack-aware z-index from usePerpsPopupNav — applied to both the dialog
   *  and the mask so deposit's mask renders above swap's dialog when nested. */
  zIndex?: number;
  onClose: () => void;
  onSuccess?: () => void;
  onDeposit?: () => void;
}

const CoinOption = ({ coin }: { coin: PerpsQuoteAsset }) => {
  const Icon = COIN_ICON_MAP[coin];
  return (
    <div className="flex items-center text-rb-neutral-title-1 gap-8">
      <Icon className="w-16 h-16" />
      <span>{coin}</span>
    </div>
  );
};

const CoinSelectPopup: React.FC<{
  visible: boolean;
  onCancel: () => void;
  coins: PerpsQuoteAsset[];
  getBalance: (coin: PerpsQuoteAsset) => BigNumber.Value;
  selectedCoin: PerpsQuoteAsset;
  onSelect: (coin: PerpsQuoteAsset) => void;
}> = ({ visible, onCancel, coins, getBalance, selectedCoin, onSelect }) => {
  const { t } = useTranslation();
  const { getContainer } = usePopupContainer();

  const sheetHeight = Math.min(360, 72 + coins.length * 54);

  return (
    <Popup
      visible={visible}
      onCancel={onCancel}
      height={sheetHeight}
      isSupportDarkMode
      closable
      closeIcon={<RcIconCloseCC className="w-14 text-r-neutral-title-1" />}
      keyboard={false}
      push={false}
      getContainer={getContainer}
      // The Drawer content itself is the surface: paint it the new bg and drop
      // antd's default body padding. Wrapping the children in another bg/padding
      // div would double both (old --r-neutral-bg-1 rim + 24px + 16px padding).
      bodyStyle={{ padding: 0 }}
      drawerStyle={{ background: 'var(--rb-neutral-bg-0)' }}
    >
      <div className="flex flex-col h-full pt-16 px-16">
        <div className="text-[20px] font-medium text-rb-neutral-title-1 text-center mb-16">
          {t('component.TokenSelector.header.title')}
        </div>
        <div className="flex-1 overflow-y-auto">
          {coins.map((c) => {
            const selected = selectedCoin === c;
            return (
              <div
                key={c}
                onClick={() => onSelect(c)}
                className={clsx(
                  'flex justify-between items-center h-[48px] mb-6 border',
                  'bg-rb-neutral-bg-5 rounded-[6px] px-16',
                  'text-13 font-medium text-rb-neutral-title-1 cursor-pointer',
                  selected
                    ? 'border-rabby-blue-default'
                    : 'border-transparent hover:border-rabby-blue-default'
                )}
              >
                <CoinOption coin={c} />
                <span className="text-13 text-rb-neutral-title-1 font-medium">
                  {new BigNumber(getBalance(c))
                    .decimalPlaces(2, BigNumber.ROUND_DOWN)
                    .toFixed()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Popup>
  );
};

export const SpotSwapModal: React.FC<SpotSwapModalProps> = ({
  visible,
  targetAsset,
  sourceAsset,
  disableSwitch,
  zIndex,
  onClose,
  onSuccess,
  onDeposit,
}) => {
  const { t } = useTranslation();
  const { handleStableCoinOrder } = usePerpsProPosition();

  const {
    fromCoin,
    toCoin,
    amount,
    setAmount,
    submitting,
    fromBalanceBN,
    receiveAmountStr,
    errorMessage,
    canSubmit,
    sortedCoins,
    getSpotBalance,
    handleFromChange,
    handleToChange,
    handlePercent,
    handleSwap,
  } = useStableCoinSwap({
    visible,
    targetAsset,
    sourceAsset,
    handleStableCoinOrder,
    onSuccess,
    onClose,
  });

  const fromBalance = fromBalanceBN.toNumber();

  // Which side's coin picker the bottom sheet is editing (null = closed).
  const [coinSelectFor, setCoinSelectFor] = React.useState<
    'from' | 'to' | null
  >(null);

  const handleSelectCoin = (coin: PerpsQuoteAsset) => {
    if (coinSelectFor === 'to') {
      handleToChange(coin);
    } else if (coinSelectFor === 'from') {
      handleFromChange(coin);
    }
    setCoinSelectFor(null);
  };

  const activeSelectedCoin = coinSelectFor === 'to' ? toCoin : fromCoin;

  const renderCoinPill = (coin: PerpsQuoteAsset, side: 'from' | 'to') => {
    const locked = !!disableSwitch;
    return (
      <button
        type="button"
        onClick={() => {
          if (!locked && !submitting) setCoinSelectFor(side);
        }}
        className={clsx(
          'inline-flex items-center justify-between gap-6',
          'px-10 h-32 rounded-[6px]',
          'border border-solid border-rb-neutral-line',
          'bg-transparent',
          'text-[14px] leading-[16px] font-medium text-rb-neutral-title-1',
          !(locked || submitting) && 'hover:border-rb-brand-default',
          'disabled:cursor-default'
        )}
        disabled={locked || submitting}
      >
        <CoinOption coin={coin} />
        {!locked && <RcIconArrowDownCC className="text-rb-neutral-secondary" />}
      </button>
    );
  };

  return (
    <Modal
      visible={visible}
      onCancel={submitting ? undefined : onClose}
      footer={null}
      centered
      width={400}
      zIndex={zIndex}
      closable={!submitting}
      closeIcon={<RcIconCloseCC className="w-14 text-r-neutral-title-1" />}
      bodyStyle={{ padding: 0, height: '540px', maxHeight: '540px' }}
      maskStyle={{
        zIndex: zIndex ?? 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      maskClosable={!submitting}
      keyboard={!submitting}
      className="modal-support-darkmode desktop-perps-modal-surface desktop-perps-spot-swap-modal"
    >
      <PopupContainer>
        <div className="bg-rb-neutral-bg-0 h-[540px] flex flex-col relative overflow-hidden">
          <div className="px-20 pt-16 pb-20 flex-1 flex flex-col">
            <h3 className="text-[18px] font-medium text-rb-neutral-title-1 text-center mb-20">
              {t('page.perps.PerpsSpotSwap.title')}
            </h3>

            <div className="mb-12 bg-rb-neutral-bg-2 rounded-[12px] px-16 py-14 flex items-center justify-between">
              <span className="text-rb-neutral-title-1 text-15 font-medium">
                {t('page.perps.PerpsSpotSwap.to')}
              </span>
              {renderCoinPill(toCoin, 'to')}
            </div>

            <div className="mb-12 bg-rb-neutral-bg-2 rounded-[12px] px-16 pt-14 pb-16">
              <div className="flex justify-between items-center mb-10">
                <span className="text-rb-neutral-title-1 text-15 font-medium">
                  {t('page.perps.PerpsSpotSwap.from')}
                </span>
                <div className="flex items-center gap-6">
                  <span className="text-rb-neutral-foot text-12">
                    {t('page.perps.PerpsSpotSwap.balance')}:{' '}
                    {fromBalanceBN
                      .decimalPlaces(4, BigNumber.ROUND_DOWN)
                      .toFixed()}
                  </span>
                  {onDeposit && fromCoin === 'USDC' && (
                    <button
                      type="button"
                      onClick={onDeposit}
                      disabled={submitting}
                      className={clsx(
                        'group inline-flex items-center justify-center w-16 h-16 rounded-[4px]'
                      )}
                    >
                      <RcIconAddDeposit className="group-hover:[&>path:first-child]:fill-r-blue-default group-hover:[&>path:first-child]:[fill-opacity:1]" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-8">
                <ThousandsInput
                  bordered={false}
                  size="large"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    // Unsigned decimal only — reject letters, signs, extra dots.
                    if (/^\d*\.?\d*$/.test(v)) setAmount(v);
                  }}
                  placeholder="0"
                  className="flex-1 p-0 text-[28px] leading-[34px] font-medium text-rb-neutral-title-1"
                  disabled={submitting}
                />
                {renderCoinPill(fromCoin, 'from')}
              </div>
            </div>

            <div className="flex gap-8 mb-16">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePercent(p)}
                  className={clsx(
                    'flex-1 h-[36px] rounded-[8px] text-13 font-medium',
                    'bg-rb-neutral-bg-2 border border-solid border-transparent',
                    'text-rb-neutral-foot',
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
                  <span className="text-rb-neutral-foot gap-4 flex items-center">
                    {t('page.perps.PerpsSpotSwap.estReceive')}
                    <TooltipWithMagnetArrow
                      overlayClassName="rectangle w-[max-content]"
                      placement="top"
                      title={t('page.perps.PerpsSpotSwap.estReceiveTooltip')}
                    >
                      <RcIconInfo className="text-rb-neutral-foot relative" />
                    </TooltipWithMagnetArrow>
                  </span>
                  <span className="text-rb-neutral-title-1 font-medium">
                    {receiveAmountStr} {toCoin}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1" />
          </div>

          <div className="border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
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

          <CoinSelectPopup
            visible={coinSelectFor !== null}
            onCancel={() => setCoinSelectFor(null)}
            coins={sortedCoins}
            getBalance={getSpotBalance}
            selectedCoin={activeSelectedCoin}
            onSelect={handleSelectCoin}
          />
        </div>
      </PopupContainer>
    </Modal>
  );
};

export default SpotSwapModal;
