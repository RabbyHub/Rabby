import { Dropdown, Menu } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as RcIconTriangleDownCC } from '@/ui/assets/perps/icon-triangle-down-cc.svg';
import { ThousandsNativeInput } from '../../components/ThousandsNativeInput';
import type {
  TpSlInputMode,
  TpSlKind,
  TpSlSideView,
  TpSlTriggerError,
} from '../../positionTpSl';
import { formatSignedValue } from './format';
import { TpSlSectionTitle } from './TpSlSectionTitle';

// 11px padding + the 1px focus/error border = Figma's 12px text inset.
const INPUT_BOX =
  'h-[40px] rounded-[6px] border border-solid bg-rb-neutral-bg-5 px-[11px] hover:border-rb-brand-default focus-within:border-rb-brand-default';

interface TpSlSideInputsProps {
  kind: TpSlKind;
  mode: TpSlInputMode;
  /** Which field the user typed in: the trigger, or the PnL / ROI target. */
  source: 'trigger' | 'mode';
  view: TpSlSideView;
  quoteAsset: string;
  /** `$62,040.56`, for the liquidation error copy. */
  liquidationPriceText: string;
  titleSize?: 'default' | 'large';
  titleExtra?: React.ReactNode;
  disabled?: boolean;
  onTriggerChange: (value: string) => void;
  onModeValueChange: (value: string) => void;
  onModeChange: (mode: TpSlInputMode) => void;
}

export const TpSlSideInputs: React.FC<TpSlSideInputsProps> = ({
  kind,
  mode,
  source,
  view,
  quoteAsset,
  liquidationPriceText,
  titleSize,
  titleExtra,
  disabled,
  onTriggerChange,
  onModeValueChange,
  onModeChange,
}) => {
  const { t } = useTranslation();
  const isTp = kind === 'takeProfit';
  const hasError = view.status === 'invalid';

  const getErrorText = (error: TpSlTriggerError | null) => {
    switch (error) {
      case 'triggerUnavailable':
        return isTp
          ? t('page.perpsPro.editTpSl.tpTriggerInvalid')
          : t('page.perpsPro.editTpSl.slTriggerInvalid');
      case 'invalidForMark':
        return t('page.perpsPro.positionTpSl.invalidTriggerForMark');
      case 'stopLossBelowLiquidation':
        return t('page.perpsPro.editTpSl.triggerHigherThanLiquidation', {
          price: liquidationPriceText,
        });
      case 'stopLossAboveLiquidation':
        return t('page.perpsPro.editTpSl.triggerLowerThanLiquidation', {
          price: liquidationPriceText,
        });
      case 'takeProfitBelowMark':
        return t('page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsLong');
      case 'takeProfitAboveMark':
        return t('page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsShort');
      case 'stopLossAboveMark':
        return t('page.perpsDetail.PerpsAutoCloseModal.stopLossTipsLong');
      case 'stopLossBelowMark':
        return t('page.perpsDetail.PerpsAutoCloseModal.stopLossTipsShort');
      default:
        return '';
    }
  };
  const errorText = getErrorText(view.error);

  const modeOptions: { value: TpSlInputMode; label: string; unit: string }[] = [
    {
      value: 'pnl',
      label: t('page.perpsPro.positionTpSl.pnl'),
      unit: quoteAsset,
    },
    { value: 'roi', label: t('page.perpsPro.positionTpSl.roi'), unit: '%' },
  ];
  const currentMode =
    modeOptions.find((option) => option.value === mode) || modeOptions[0];

  // A typed target takes its side's sign (as on mobile; the estimate below can
  // round to 0). A typed trigger shows the sign of the PnL it implies.
  const sign =
    source === 'trigger' && view.pnl && !view.pnl.isZero()
      ? view.pnl.gt(0)
        ? '+'
        : '-'
      : isTp
      ? '+'
      : '-';
  const showHint = view.status !== 'empty' && view.pnl && view.roi;

  return (
    <section className="flex flex-col gap-[12px]">
      <TpSlSectionTitle kind={kind} size={titleSize} extra={titleExtra} />
      <div className="flex gap-[8px]">
        <ThousandsNativeInput
          value={view.triggerPrice}
          inputMode="decimal"
          disabled={disabled}
          placeholder={
            isTp
              ? t('page.perpsPro.positionTpSl.tpTrigger')
              : t('page.perpsPro.positionTpSl.slTrigger')
          }
          onChange={(e) => onTriggerChange(e.target.value)}
          className={clsx(
            INPUT_BOX,
            'min-w-0 flex-1 text-[15px] leading-[18px] font-medium text-rb-neutral-title-1 outline-none',
            'placeholder:font-normal placeholder:text-rb-neutral-secondary',
            hasError ? 'border-rb-red-default' : 'border-transparent'
          )}
        />
        <div
          className={clsx(
            INPUT_BOX,
            'flex min-w-0 flex-1 items-center',
            hasError ? 'border-rb-red-default' : 'border-transparent'
          )}
        >
          {view.modeValue ? (
            <span className="shrink-0 text-[15px] leading-[18px] text-rb-neutral-title-1">
              {sign}
            </span>
          ) : null}
          <ThousandsNativeInput
            value={view.modeValue}
            inputMode="decimal"
            disabled={disabled}
            placeholder={currentMode.label}
            onChange={(e) => onModeValueChange(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] leading-[18px] text-rb-neutral-title-1 outline-none placeholder:text-rb-neutral-secondary"
          />
          <Dropdown
            trigger={['click']}
            transitionName=""
            disabled={disabled}
            overlay={
              <Menu
                className="bg-r-neutral-bg1"
                onClick={({ key }) => onModeChange(key as TpSlInputMode)}
              >
                {modeOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    className="text-r-neutral-title1 hover:bg-r-blue-light1"
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <button
              type="button"
              className="ml-[10px] flex shrink-0 items-center gap-[4px] border-0 bg-transparent p-0 text-[15px] leading-[18px] text-rb-neutral-foot"
            >
              {currentMode.unit}
              <RcIconTriangleDownCC className="h-[16px] w-[16px] text-rb-neutral-secondary" />
            </button>
          </Dropdown>
        </div>
      </div>
      {showHint || errorText ? (
        <div className="flex flex-col gap-[6px] text-[12px] leading-[14px]">
          {showHint && view.pnl && view.roi ? (
            <div className="text-rb-neutral-foot">
              <Trans
                i18nKey="page.perpsPro.positionTpSl.estimatedPnlHint"
                values={{
                  pnl: formatSignedValue(view.pnl),
                  quoteAsset,
                  roi: formatSignedValue(view.roi),
                }}
                components={{
                  value: (
                    <span
                      className={
                        view.pnl.gte(0)
                          ? 'text-rb-green-default'
                          : 'text-rb-red-default'
                      }
                    />
                  ),
                }}
              />
            </div>
          ) : null}
          {errorText ? (
            <div className="text-rb-red-default">{errorText}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
