import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Menu, Tooltip } from 'antd';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import { ReactComponent as RcIconArrowDownCC } from '@/ui/assets/arrow-down-cc.svg';
import { ReactComponent as RcIconAddDeposit } from '@/ui/assets/perps/IconAddDeposit.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { PerpsQuoteAsset } from '../constants';
import { QUOTE_ASSET_ICON_MAP } from '../components/quoteAssetIcons';
import { usePerpsPosition } from '../hooks/usePerpsPosition';
import { useStableCoinSwap } from '../hooks/useStableCoinSwap';

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
  const { handleStableCoinOrder } = usePerpsPosition();

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

  const CoinOption = ({ coin }: { coin: PerpsQuoteAsset }) => {
    const Icon = QUOTE_ASSET_ICON_MAP[coin];
    return (
      <div className="flex items-center gap-8 text-r-neutral-title-1">
        <Icon className="w-16 h-16" />
        <span>{coin}</span>
      </div>
    );
  };

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
              <span className="text-r-neutral-title-1 font-medium text-13">
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
          disabled={!!disableSwitch || submitting}
          overlay={renderCoinMenu(handleToChange)}
        >
          <button
            type="button"
            disabled={!!disableSwitch || submitting}
            className={coinPillClassName}
          >
            <CoinOption coin={toCoin} />
            {!disableSwitch && (
              <RcIconArrowDownCC className="text-r-neutral-foot" />
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
            {onDeposit && fromCoin === 'USDC' && (
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
                <RcIconArrowDownCC className="text-r-neutral-foot" />
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
            <Tooltip
              overlayClassName="rectangle w-[max-content]"
              placement="top"
              title={t('page.perps.PerpsSpotSwap.estReceiveTooltip')}
            >
              <RcIconInfo className="text-r-neutral-foot relative" />
            </Tooltip>
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
