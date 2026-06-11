import { MarketData } from '@/ui/models/perps';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Dropdown, Menu, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { ReactComponent as RcIconPerpsTpslDelete } from '@/ui/assets/perps/IconPerpsTpslDelete.svg';
import { ReactComponent as RcIconArrowDownPerpsCC } from '@/ui/assets/perps/icon-arrow-down.svg';
import { formatTpOrSlPrice, validatePriceInput } from '../../Perps/utils';
import { PerpsDisplayCoinName } from '../../Perps/components/PerpsDisplayCoinName';
import { PositionFormatData } from '../components/UserInfoHistory/PositionsInfo';
import { usePerpsProPosition } from '../hooks/usePerpsProPosition';
import perpsToast from '../components/PerpsToast';
import stats from '@/stats';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { getStatsReportSide } from '../utils';
import { TPSLSettingMode } from '../types';

export interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm?: () => void;

  position: PositionFormatData;
  marketData: MarketData;
}

type TpslSide = 'tp' | 'sl';

type TpslSideState = {
  mode: TPSLSettingMode;
  triggerPrice: string;
  modeValue: string;
  estimatedPnl: string;
  estimatedPnlPercent: string;
  error: string;
};

type SideAction =
  | {
      type: 'none';
    }
  | {
      type: 'cancel';
      oid: number;
    }
  | {
      type: 'modify';
      oid: number;
      triggerPx: string;
    }
  | {
      type: 'create';
      triggerPx: string;
    };

const MODE_OPTIONS: {
  value: TPSLSettingMode;
  label: string;
}[] = [
  { value: 'price', label: 'Price' },
  { value: 'pnl', label: 'PNL' },
  { value: 'roi', label: 'ROI' },
];

const EMPTY_SIDE_STATE: TpslSideState = {
  mode: 'price',
  triggerPrice: '',
  modeValue: '',
  estimatedPnl: '',
  estimatedPnlPercent: '',
  error: '',
};

const getOrderTriggerPx = (position: PositionFormatData, side: TpslSide) => {
  return side === 'tp'
    ? position.tpItem?.triggerPx || ''
    : position.slItem?.triggerPx || '';
};

const getOrderOid = (position: PositionFormatData, side: TpslSide) => {
  return side === 'tp' ? position.tpItem?.oid : position.slItem?.oid;
};

const getDefaultMode = (position: PositionFormatData, side: TpslSide) => {
  if (getOrderTriggerPx(position, side)) {
    return 'price';
  }
  return side === 'tp' ? 'pnl' : 'roi';
};

const stripDecorations = (value: string) => {
  return value.replace(',', '.').replace(/[$,%\s]/g, '');
};

const sanitizeUnsignedDecimal = (value: string) => {
  const next = stripDecorations(value).replace(/[+-]/g, '');
  if (/^\d*\.?\d{0,2}$/.test(next)) {
    return next;
  }
  return null;
};

const formatSignedInput = (side: TpslSide, value: string) => {
  if (!value) return '';
  return `${side === 'tp' ? '+' : '-'}${value}`;
};

const parseModeValue = (side: TpslSide, value: string) => {
  const clean = sanitizeUnsignedDecimal(value);
  if (!clean || clean === '.') {
    return null;
  }
  const numeric = Number(clean);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return side === 'tp' ? numeric : -numeric;
};

const formatModeValueFromNumber = (value: number, decimals = 2) => {
  if (!Number.isFinite(value) || value === 0) return '';
  return `${value > 0 ? '+' : '-'}${new BigNumber(Math.abs(value))
    .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
    .toString()}`;
};

const calculatePnlByTrigger = ({
  position,
  triggerPrice,
}: {
  position: PositionFormatData;
  triggerPrice: string;
}) => {
  const trigger = Number(triggerPrice);
  const entryPrice = Number(position.entryPx);
  const size = Number(position.size);
  if (!trigger || !entryPrice || !size) {
    return {
      pnl: new BigNumber(0),
      roi: new BigNumber(0),
    };
  }

  const sideMultiplier = position.direction === 'Long' ? 1 : -1;
  const pnl = new BigNumber(trigger)
    .minus(entryPrice)
    .times(size)
    .times(sideMultiplier);
  const margin = new BigNumber(size).times(entryPrice).div(position.leverage);
  const roi = margin.gt(0) ? pnl.div(margin).times(100) : new BigNumber(0);

  return { pnl, roi };
};

const getTriggerFromPnl = ({
  position,
  pnl,
  szDecimals,
}: {
  position: PositionFormatData;
  pnl: number;
  szDecimals: number;
}) => {
  const entryPrice = new BigNumber(position.entryPx || 0);
  const size = new BigNumber(position.size || 0);
  if (!entryPrice.gt(0) || !size.gt(0)) return '';

  const priceDelta = new BigNumber(pnl).div(size);
  const trigger =
    position.direction === 'Long'
      ? entryPrice.plus(priceDelta)
      : entryPrice.minus(priceDelta);

  if (!trigger.gt(0)) return '';
  return formatTpOrSlPrice(trigger.toNumber(), szDecimals);
};

const getTriggerFromRoi = ({
  position,
  roi,
  szDecimals,
}: {
  position: PositionFormatData;
  roi: number;
  szDecimals: number;
}) => {
  const entryPrice = new BigNumber(position.entryPx || 0);
  const size = new BigNumber(position.size || 0);
  if (!entryPrice.gt(0) || !size.gt(0) || !position.leverage) return '';

  const margin = size.times(entryPrice).div(position.leverage);
  const pnl = margin.times(roi).div(100);
  return getTriggerFromPnl({
    position,
    pnl: pnl.toNumber(),
    szDecimals,
  });
};

const getValidationError = ({
  position,
  side,
  triggerPrice,
  markPrice,
  t,
}: {
  position: PositionFormatData;
  side: TpslSide;
  triggerPrice: string;
  markPrice: number;
  t: ReturnType<typeof useTranslation>['t'];
}) => {
  if (!triggerPrice || Number(triggerPrice) === 0) {
    return '';
  }
  if (!markPrice) {
    return '';
  }

  const trigger = Number(triggerPrice);

  if (side === 'tp') {
    if (position.direction === 'Long' && trigger <= markPrice) {
      return t('page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsLong');
    }
    if (position.direction === 'Short' && trigger >= markPrice) {
      return t('page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsShort');
    }
  }

  if (side === 'sl') {
    if (position.direction === 'Long' && trigger >= markPrice) {
      return t('page.perpsDetail.PerpsAutoCloseModal.stopLossTipsLong');
    }
    if (position.direction === 'Short' && trigger <= markPrice) {
      return t('page.perpsDetail.PerpsAutoCloseModal.stopLossTipsShort');
    }
  }

  return '';
};

const hydrateSideFromTrigger = ({
  position,
  side,
  state,
  triggerPrice,
  szDecimals,
  markPrice,
  t,
}: {
  position: PositionFormatData;
  side: TpslSide;
  state: TpslSideState;
  triggerPrice: string;
  szDecimals: number;
  markPrice: number;
  t: ReturnType<typeof useTranslation>['t'];
}): TpslSideState => {
  if (!triggerPrice || Number(triggerPrice) === 0) {
    return {
      ...state,
      triggerPrice,
      modeValue: '',
      estimatedPnl: '',
      estimatedPnlPercent: '',
      error: '',
    };
  }

  const { pnl, roi } = calculatePnlByTrigger({ position, triggerPrice });
  const modeValue =
    state.mode === 'pnl'
      ? formatModeValueFromNumber(pnl.toNumber())
      : state.mode === 'roi'
      ? formatModeValueFromNumber(roi.toNumber())
      : '';

  return {
    ...state,
    triggerPrice,
    modeValue,
    estimatedPnl: pnl.toFixed(2),
    estimatedPnlPercent: roi.toFixed(2),
    error: getValidationError({
      position,
      side,
      triggerPrice,
      markPrice,
      t,
    }),
  };
};

const getInitialSideState = ({
  position,
  side,
  szDecimals,
  markPrice,
  t,
}: {
  position: PositionFormatData;
  side: TpslSide;
  szDecimals: number;
  markPrice: number;
  t: ReturnType<typeof useTranslation>['t'];
}) => {
  const triggerPx = getOrderTriggerPx(position, side);
  const mode = getDefaultMode(position, side);
  const baseState: TpslSideState = {
    ...EMPTY_SIDE_STATE,
    mode,
  };

  if (!triggerPx || Number(triggerPx) <= 0) {
    return baseState;
  }

  return hydrateSideFromTrigger({
    position,
    side,
    state: baseState,
    triggerPrice: validatePriceInput(triggerPx, szDecimals)
      ? triggerPx
      : formatTpOrSlPrice(Number(triggerPx), szDecimals),
    szDecimals,
    markPrice,
    t,
  });
};

const isSameTrigger = (left?: string, right?: string) => {
  if (!left && !right) return true;
  if (!left || !right) return false;
  const leftBN = new BigNumber(left);
  const rightBN = new BigNumber(right);
  if (leftBN.isNaN() || rightBN.isNaN()) {
    return left === right;
  }
  return leftBN.eq(rightBN);
};

const resolveSideAction = (
  position: PositionFormatData,
  side: TpslSide,
  state: TpslSideState
): SideAction => {
  const oid = getOrderOid(position, side);
  const existingTrigger = getOrderTriggerPx(position, side);
  const nextTrigger =
    state.triggerPrice && Number(state.triggerPrice) > 0
      ? state.triggerPrice
      : '';

  if (oid && existingTrigger && !nextTrigger) {
    return { type: 'cancel', oid };
  }

  if (oid && existingTrigger && nextTrigger) {
    return isSameTrigger(existingTrigger, nextTrigger)
      ? { type: 'none' }
      : { type: 'modify', oid, triggerPx: nextTrigger };
  }

  if (!oid && nextTrigger) {
    return { type: 'create', triggerPx: nextTrigger };
  }

  return { type: 'none' };
};

export const EditTpSlModal: React.FC<Props> = ({
  visible,
  onCancel,
  position,
  marketData,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const currentPerpsAccount = useRabbySelector(
    (store) => store.perps.currentPerpsAccount
  );

  const szDecimals = marketData.szDecimals ?? 5;
  const pxDecimals = marketData.pxDecimals ?? 2;
  const currentPrice = Number(marketData.markPx || position.markPx || 0);
  const markPrice = currentPrice || Number(position.markPx || 0);

  const [tpState, setTpState] = React.useState<TpslSideState>({
    ...EMPTY_SIDE_STATE,
    mode: 'pnl',
  });
  const [slState, setSlState] = React.useState<TpslSideState>({
    ...EMPTY_SIDE_STATE,
    mode: 'roi',
  });

  const {
    handleSetAutoClose,
    handleModifyTpSlOrders,
    handleCancelOrder,
  } = usePerpsProPosition();

  const resetForm = useMemoizedFn(() => {
    setTpState(
      getInitialSideState({
        position,
        side: 'tp',
        szDecimals,
        markPrice,
        t,
      })
    );
    setSlState(
      getInitialSideState({
        position,
        side: 'sl',
        szDecimals,
        markPrice,
        t,
      })
    );
  });

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const updateSideByTrigger = useMemoizedFn(
    (side: TpslSide, triggerPrice: string) => {
      const value = stripDecorations(triggerPrice);
      if (!validatePriceInput(value, szDecimals)) {
        return;
      }

      const setter = side === 'tp' ? setTpState : setSlState;
      setter((prev) =>
        hydrateSideFromTrigger({
          position,
          side,
          state: prev,
          triggerPrice: value,
          szDecimals,
          markPrice,
          t,
        })
      );
    }
  );

  const updateSideByModeValue = useMemoizedFn(
    (side: TpslSide, modeValue: string) => {
      const clean = sanitizeUnsignedDecimal(modeValue);
      if (clean === null) {
        return;
      }

      const setter = side === 'tp' ? setTpState : setSlState;
      setter((prev) => {
        const nextModeValue = formatSignedInput(side, clean);
        const numericValue = parseModeValue(side, clean);
        const triggerPrice =
          numericValue === null
            ? ''
            : prev.mode === 'pnl'
            ? getTriggerFromPnl({
                position,
                pnl: numericValue,
                szDecimals,
              })
            : getTriggerFromRoi({
                position,
                roi: numericValue,
                szDecimals,
              });

        return hydrateSideFromTrigger({
          position,
          side,
          state: {
            ...prev,
            modeValue: nextModeValue,
          },
          triggerPrice,
          szDecimals,
          markPrice,
          t,
        });
      });
    }
  );

  const updateSideMode = useMemoizedFn(
    (side: TpslSide, mode: TPSLSettingMode) => {
      const setter = side === 'tp' ? setTpState : setSlState;
      setter((prev) => {
        const nextState = {
          ...prev,
          mode,
          modeValue: '',
        };
        return hydrateSideFromTrigger({
          position,
          side,
          state: nextState,
          triggerPrice: prev.triggerPrice,
          szDecimals,
          markPrice,
          t,
        });
      });

      try {
        localStorage.setItem(
          `perps_tpsl_mode_${side === 'tp' ? 'takeProfit' : 'stopLoss'}`,
          mode
        );
      } catch (e) {
        // ignore localStorage errors
      }
    }
  );

  const clearSide = useMemoizedFn((side: TpslSide) => {
    const setter = side === 'tp' ? setTpState : setSlState;
    setter((prev) => ({
      ...prev,
      triggerPrice: '',
      modeValue: '',
      estimatedPnl: '',
      estimatedPnlPercent: '',
      error: '',
    }));
  });

  const tpAction = useMemo(
    () => resolveSideAction(position, 'tp', tpState),
    [position, tpState]
  );
  const slAction = useMemo(
    () => resolveSideAction(position, 'sl', slState),
    [position, slState]
  );

  const hasAnyAction = tpAction.type !== 'none' || slAction.type !== 'none';
  const hasError = Boolean(tpState.error || slState.error);
  const canSubmit = hasAnyAction && !hasError;

  const reportCreateStats = useMemoizedFn(
    (side: TpslSide, triggerPx: string) => {
      const isBuy = position.direction === 'Short';
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type:
          side === 'tp' ? 'position take profit' : 'position stop loss',
        leverage: position.leverage.toString(),
        trade_side: getStatsReportSide(isBuy, true),
        margin_mode: position.type === 'cross' ? 'cross' : 'isolated',
        coin: position.coin,
        size: position.size,
        price: triggerPx,
        trade_usd_value: new BigNumber(triggerPx)
          .times(position.size)
          .toFixed(2),
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
      });
    }
  );

  const { loading, runAsync: runSubmit } = useRequest(
    async () => {
      const direction = position.direction;
      const actions = {
        tp: tpAction,
        sl: slAction,
      };

      const cancelParams = (['tp', 'sl'] as const)
        .map((side) => {
          const action = actions[side];
          return action.type === 'cancel'
            ? {
                coin: position.coin,
                oid: action.oid,
              }
            : null;
        })
        .filter(Boolean) as { coin: string; oid: number }[];

      if (cancelParams.length) {
        await handleCancelOrder(cancelParams);
      }

      const modifyTp =
        actions.tp.type === 'modify'
          ? {
              triggerPx: actions.tp.triggerPx,
              oid: actions.tp.oid,
            }
          : undefined;
      const modifySl =
        actions.sl.type === 'modify'
          ? {
              triggerPx: actions.sl.triggerPx,
              oid: actions.sl.oid,
            }
          : undefined;

      if (modifyTp || modifySl) {
        await handleModifyTpSlOrders({
          coin: position.coin,
          direction,
          tp: modifyTp,
          sl: modifySl,
        });
      }

      const createTp =
        actions.tp.type === 'create' ? actions.tp.triggerPx : '';
      const createSl =
        actions.sl.type === 'create' ? actions.sl.triggerPx : '';

      if (createTp || createSl) {
        await handleSetAutoClose({
          coin: position.coin,
          tpTriggerPx: createTp,
          slTriggerPx: createSl,
          direction,
        });
        if (createTp) {
          reportCreateStats('tp', createTp);
        }
        if (createSl) {
          reportCreateStats('sl', createSl);
        }
      }

      if ((modifyTp || modifySl) && !createTp && !createSl) {
        perpsToast.success({
          title: t('page.perps.toast.success'),
          description: t('page.perps.toast.setAutoCloseSuccess'),
        });
      }

      dispatch.perps.fetchPositionOpenOrders();
    },
    {
      manual: true,
      onSuccess: () => {
        onConfirm?.();
      },
    }
  );

  const renderModeMenu = (side: TpslSide) => (
    <Menu
      className="bg-r-neutral-bg1"
      onClick={({ key }) => updateSideMode(side, key as TPSLSettingMode)}
    >
      {MODE_OPTIONS.map((option) => (
        <Menu.Item
          className="text-r-neutral-title1 hover:bg-r-blue-light1"
          key={option.value}
        >
          {option.label}
        </Menu.Item>
      ))}
    </Menu>
  );

  const renderPnlText = (state: TpslSideState) => {
    if (!state.triggerPrice || !state.estimatedPnl) {
      return <span className="text-rb-neutral-foot">-</span>;
    }

    const pnl = Number(state.estimatedPnl);
    return (
      <span
        className={pnl >= 0 ? 'text-rb-green-default' : 'text-rb-red-default'}
      >
        {pnl >= 0 ? '+' : '-'}
        {formatUsdValue(Math.abs(pnl))}
        .
      </span>
    );
  };

  const renderSideSection = (side: TpslSide) => {
    const state = side === 'tp' ? tpState : slState;
    const isTp = side === 'tp';
    const label = isTp
      ? t('page.perpsPro.editTpSl.takeProfit')
      : t('page.perpsPro.editTpSl.stopLoss');
    const cancelLabel = isTp
      ? t('page.perpsPro.editTpSl.cancelTp')
      : t('page.perpsPro.editTpSl.cancelSl');
    const modeLabel =
      MODE_OPTIONS.find((option) => option.value === state.mode)?.label ||
      'Price';
    const hasContent = Boolean(state.triggerPrice || state.modeValue);

    return (
      <section className="flex flex-col gap-[12px]">
        <div className="flex items-center justify-between">
          <div className="text-[14px] leading-[17px] font-semibold text-r-neutral-title-1">
            {label}
          </div>
          {hasContent ? (
            <button
              type="button"
              className="flex items-center gap-[6px] border-0 bg-transparent p-0 text-[14px] leading-[17px] text-rb-neutral-body hover:text-rb-brand-default"
              onClick={() => clearSide(side)}
            >
              <RcIconPerpsTpslDelete className="block h-[14px] w-[14px] flex-shrink-0" />
              {cancelLabel}
            </button>
          ) : null}
        </div>
        <div className="flex items-start gap-[8px]">
          <input
            value={state.triggerPrice}
            inputMode="decimal"
            placeholder={t('page.perpsPro.editTpSl.triggerPrice')}
            onChange={(e) => updateSideByTrigger(side, e.target.value)}
            className={clsx(
              'h-[44px] min-w-0 flex-1 rounded-[8px] border border-solid bg-rb-neutral-bg-5 px-[12px]',
              'text-[15px] leading-[18px] font-medium text-r-neutral-title-1 outline-none',
              'placeholder:text-rb-neutral-info',
              state.error ? 'border-rb-red-default' : 'border-rb-neutral-line',
              'focus:border-rb-brand-default hover:border-rb-brand-default'
            )}
          />
          <div
            className={clsx(
              'flex h-[44px] w-[143px] items-center justify-between rounded-[8px] border border-solid bg-rb-neutral-bg-5 px-[12px]',
              state.error ? 'border-rb-red-default' : 'border-rb-neutral-line',
              'focus-within:border-rb-brand-default hover:border-rb-brand-default'
            )}
          >
            {state.mode === 'price' ? (
              <span className="min-w-0 text-[15px] leading-[18px] font-medium text-r-neutral-title-1" />
            ) : (
              <input
                value={state.modeValue}
                inputMode="decimal"
                onChange={(e) => updateSideByModeValue(side, e.target.value)}
                className={clsx(
                  'min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] leading-[18px] font-medium outline-none',
                  isTp ? 'text-rb-green-default' : 'text-rb-red-default'
                )}
              />
            )}
            <Dropdown
              trigger={['click']}
              overlay={renderModeMenu(side)}
              transitionName=""
            >
              <button
                type="button"
                className="ml-[8px] flex flex-shrink-0 items-center gap-[3px] border-0 bg-transparent p-0 text-[15px] leading-[18px] text-rb-neutral-foot"
              >
                {modeLabel}
                <RcIconArrowDownPerpsCC className="h-[14px] w-[14px] text-rb-neutral-foot" />
              </button>
            </Dropdown>
          </div>
        </div>
        <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
          {t('page.perpsPro.editTpSl.estimatedPnlWillBe')}{' '}
          {renderPnlText(state)}
        </div>
        {state.error ? (
          <div className="text-[12px] leading-[14px] text-rb-red-default">
            {state.error}
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <Modal
      bodyStyle={{ padding: 0, maxHeight: 'unset' }}
      centered
      destroyOnClose
      closable
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      className="modal-support-darkmode desktop-perps-modal-surface desktop-perps-tpsl-modal"
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-rb-neutral-body" />
      }
    >
      <div className="flex min-h-[540px] flex-col bg-rb-neutral-bg-1">
        <div className="relative flex h-[56px] flex-shrink-0 items-center justify-center px-[56px] text-center text-20 font-medium text-r-neutral-title-1">
          {t('page.perpsPro.editTpSl.title')}
        </div>

        <div className="flex-1 px-[20px] overflow-y-auto pb-24">
          <section className="flex items-center justify-between pt-[10px]">
            <div className="flex flex-col gap-[3px]">
              <PerpsDisplayCoinName
                item={marketData}
                separator="-"
                className="text-[16px] leading-[20px] font-medium text-r-neutral-title-1"
              />
              <div
                className={clsx(
                  'flex h-[16px] w-max items-center rounded-[3px] px-[4px]',
                  'text-[10px] leading-[16px] font-medium',
                  position.direction === 'Long'
                    ? 'bg-rb-green-light-2 text-rb-green-default'
                    : 'bg-rb-red-light-2 text-rb-red-default'
                )}
              >
                {position.direction.toLowerCase()} {position.leverage}x
              </div>
            </div>
            <div className="flex flex-col items-end gap-[3px] text-[12px] font-medium">
              <span className="leading-[20px] text-rb-neutral-secondary">
                {t('page.perpsPro.editTpSl.entryCurrentPrice')}
              </span>
              <div className="flex items-center gap-[3px] text-r-neutral-title-1">
                <span>{splitNumberByStep(position.entryPx)}</span>
                <span>/</span>
                <span>
                  {splitNumberByStep(currentPrice.toFixed(pxDecimals))}
                </span>
              </div>
            </div>
          </section>

          <div className="my-[24px] h-0 border-t border-solid border-rb-neutral-line" />

          <div className="flex flex-col gap-[24px]">
            {renderSideSection('tp')}
            {renderSideSection('sl')}
          </div>
        </div>

        <div className="bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-rb-neutral-bg-1">
          <Button
            block
            size="large"
            type="primary"
            className="desktop-perps-tpsl-confirm h-[48px] rounded-[6px] text-15 font-medium"
            loading={loading}
            disabled={!canSubmit || loading}
            onClick={runSubmit}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
