import React from 'react';
import { Modal, Button, Dropdown, Menu, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import clsx from 'clsx';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
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

  const CoinOption = ({ coin }: { coin: PerpsQuoteAsset }) => {
    const Icon = COIN_ICON_MAP[coin];
    return (
      <div className="flex items-center text-rb-neutral-title-1 gap-8">
        <Icon className="w-16 h-16" />
        <span>{coin}</span>
      </div>
    );
  };

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
              <span className="text-rb-neutral-title-1 font-medium text-[13px]">
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
                placement="bottomRight"
                transitionName=""
                forceRender
                disabled={!!disableSwitch || submitting}
                overlay={renderCoinMenu(handleToChange, toCoin)}
              >
                <button
                  type="button"
                  className={clsx(
                    'inline-flex items-center justify-between gap-6',
                    'px-10 h-32 rounded-[6px]',
                    'border border-solid border-rb-neutral-line',
                    'bg-transparent',
                    'text-[14px] leading-[16px] font-medium text-rb-neutral-title-1',
                    !(!!disableSwitch || submitting) &&
                      'hover:border-rb-brand-default',
                    'disabled:cursor-default'
                  )}
                  disabled={!!disableSwitch || submitting}
                >
                  <CoinOption coin={toCoin} />
                  {!disableSwitch && (
                    <RcIconArrowDownCC className="text-rb-neutral-secondary" />
                  )}
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
                        'inline-flex items-center justify-center w-16 h-16 rounded-[4px]',
                        'text-r-blue-default hover:bg-rb-brand-light-1',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                    >
                      <RcIconAddDeposit />
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
                  placement="bottomRight"
                  transitionName=""
                  forceRender
                  disabled={disableSwitch || submitting}
                  overlay={renderCoinMenu(handleFromChange, fromCoin)}
                >
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex items-center justify-between gap-6',
                      'px-10 h-32 rounded-[6px]',
                      'border border-solid border-rb-neutral-line',
                      'bg-transparent',
                      'text-[14px] leading-[16px] font-medium text-rb-neutral-title-1',
                      !(disableSwitch || submitting) &&
                        'hover:border-rb-brand-default',
                      'disabled:cursor-default'
                    )}
                    disabled={disableSwitch || submitting}
                  >
                    <CoinOption coin={fromCoin} />
                    {!disableSwitch && (
                      <RcIconArrowDownCC className="text-rb-neutral-secondary" />
                    )}
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
                  <span className="text-r-neutral-foot gap-4 flex items-center">
                    {t('page.perps.PerpsSpotSwap.estReceive')}
                    <TooltipWithMagnetArrow
                      overlayClassName="rectangle w-[max-content]"
                      placement="top"
                      title={t('page.perps.PerpsSpotSwap.estReceiveTooltip')}
                    >
                      <RcIconInfo className="text-r-neutral-foot relative" />
                    </TooltipWithMagnetArrow>
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
