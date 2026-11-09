import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { splitNumberByStep } from '@/ui/utils';
import { MarketData } from '@/ui/state/perps';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { ReactComponent as RcIconMarginAdd } from 'ui/assets/perps/IconMarginAddCC.svg';
import { ReactComponent as RcIconRoiUp } from 'ui/assets/perps/IconRoiUpCC.svg';
import { ReactComponent as RcIconRoiDown } from 'ui/assets/perps/IconRoiDownCC.svg';
import { DashedUnderlineText } from '../../DesktopPerps/components/DashedUnderlineText';
import {
  formatPerpsCoin,
  handleDisplayFundingPayments,
} from '../../DesktopPerps/utils';
import { formatPercent } from '../utils';
import { formatLiquidationGap } from '../positionDisplay';
import { EditTpSlTag } from './EditTpSlTag';

export interface PerpsPositionSectionData {
  pnl: number;
  pnlPercent: number;
  positionValue: number;
  size: number;
  marginUsed: number;
  leverage: number;
  type: 'cross' | 'isolated';
  direction: 'Long' | 'Short';
  entryPrice: number;
  liquidationPrice: string;
  fundingPayments: string;
}

interface PerpsPositionSectionProps {
  coin: string;
  positionData: PerpsPositionSectionData;
  /** Raw `liquidationPx` from the position; null when there is none. */
  rawLiquidationPrice?: string | null;
  markPrice: number;
  tpPrice?: string;
  slPrice?: string;
  currentAssetCtx?: MarketData;
  activeAssetCtx?: WsActiveAssetCtx['ctx'] | null;
  handleActionApproveStatus: () => Promise<void>;
  onEditMargin: () => void;
  onSetAutoClose: (params: {
    tpTriggerPx: string;
    slTriggerPx: string;
  }) => Promise<void>;
  onCancelAutoClose: (actionType: 'tp' | 'sl') => Promise<void>;
}

const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-8 py-6 text-13">
    <div className="text-r-neutral-body">{label}</div>
    <div className="font-medium text-r-neutral-title-1 text-right">{value}</div>
  </div>
);

const CardTitle: React.FC = ({ children }) => (
  <div className="py-6 text-14 leading-[18px] font-bold text-r-neutral-body">
    {children}
  </div>
);

export const PerpsPositionSection: React.FC<PerpsPositionSectionProps> = ({
  coin,
  positionData,
  rawLiquidationPrice,
  markPrice,
  tpPrice,
  slPrice,
  currentAssetCtx,
  activeAssetCtx,
  handleActionApproveStatus,
  onEditMargin,
  onSetAutoClose,
  onCancelAutoClose,
}) => {
  const { t } = useTranslation();
  const {
    pnl,
    pnlPercent,
    direction,
    type,
    leverage,
    size,
    marginUsed,
    entryPrice,
  } = positionData;
  const quoteAsset = currentAssetCtx?.quoteAsset || 'USDC';

  const expectedPnl = (price?: string) => {
    if (!price || !Number(price)) return null;
    const delta = Number(price) - entryPrice;
    return (direction === 'Long' ? delta : -delta) * size;
  };

  const nextFundingRate = activeAssetCtx?.funding ?? currentAssetCtx?.funding;
  const isFundingGains = Number(positionData.fundingPayments || 0) < 0;

  const tpSlTagProps = {
    handleActionApproveStatus,
    coin,
    markPrice,
    currentAssetCtx,
    direction,
    size,
    margin: marginUsed,
    leverage: leverage || 1,
    liqPrice: Number(positionData.liquidationPrice || 0),
    pxDecimals: currentAssetCtx?.pxDecimals ?? 2,
    szDecimals: currentAssetCtx?.szDecimals || 0,
    entryPrice,
    type: 'hasPosition' as const,
    variant: 'position' as const,
    quoteAsset,
  };

  return (
    <div className="flex flex-col gap-12 mt-16">
      <div className="flex items-center gap-6">
        <div className="text-15 font-medium text-r-neutral-title-1 flex items-center gap-4">
          <span className="w-[2px] h-[12px] bg-r-blue-default inline-block" />
          {t('page.perps.position')}
        </div>
        <span
          className={clsx(
            'text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px]',
            direction === 'Long'
              ? 'text-r-green-default bg-r-green-light'
              : 'text-r-red-default bg-r-red-light'
          )}
        >
          {direction} {leverage}x
        </span>
        <span className="text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px] bg-r-neutral-line text-r-neutral-foot gap-2">
          {type === 'cross' ? t('page.perps.cross') : t('page.perps.isolated')}
          {type === 'cross' && (
            <Tooltip
              overlayClassName="rectangle"
              placement="bottom"
              title={t('page.perps.crossMarginLiqPriceTip')}
            >
              <RcIconInfo
                viewBox="0 0 14 14"
                width={12}
                height={12}
                className="text-r-neutral-foot"
              />
            </Tooltip>
          )}
        </span>
      </div>

      <div className="bg-r-neutral-card1 rounded-[8px] px-16 py-12">
        <div className="flex items-start justify-between gap-8">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="text-13 leading-[18px] font-medium text-rb-neutral-secondary">
              {t('page.perpsDetail.simpleAccount.margin')}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-20 leading-[24px] font-bold text-r-neutral-title-1">
                ${splitNumberByStep(marginUsed.toFixed(2))}
              </span>
              {type === 'isolated' && (
                <RcIconMarginAdd
                  className="w-20 h-20 text-r-neutral-foot cursor-pointer hover:text-r-blue-default"
                  onClick={onEditMargin}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-4 min-w-0">
            <div className="text-13 leading-[18px] font-medium text-rb-neutral-secondary">
              {t('page.perps.unrealizedPnl')}
            </div>
            <div
              className={clsx(
                'text-20 leading-[24px] font-bold',
                pnl >= 0 ? 'text-r-green-default' : 'text-r-red-default'
              )}
            >
              {pnl >= 0 ? '+' : '-'}${splitNumberByStep(Math.abs(pnl).toFixed(2))}
            </div>
            <div
              className={clsx(
                'flex items-center gap-[3px] text-12 leading-[16px] font-bold',
                pnlPercent > 0
                  ? 'text-r-green-default'
                  : pnlPercent < 0
                  ? 'text-r-red-default'
                  : 'text-r-neutral-foot'
              )}
            >
              {pnlPercent > 0 && <RcIconRoiUp className="w-16 h-16" />}
              {pnlPercent < 0 && <RcIconRoiDown className="w-16 h-16" />}
              {pnlPercent > 0 ? '+' : ''}
              {pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
        <div className="h-[0.5px] bg-r-neutral-line my-12" />
        <Row
          label={
            <DashedUnderlineText
              needCursor={false}
              tooltipText={t('page.perps.sizeTips')}
            >
              {t('page.perps.size')}
            </DashedUnderlineText>
          }
          value={`${splitNumberByStep(
            positionData.positionValue.toFixed(2)
          )} ${quoteAsset} = ${size} ${formatPerpsCoin(coin)}`}
        />
        <Row
          label={t('page.perpsDetail.simpleAccount.averageEntry')}
          value={`$${splitNumberByStep(entryPrice)}`}
        />
        <Row
          label={t('page.perpsDetail.simpleAccount.estimatedLiquidationPrice')}
          value={
            Number(rawLiquidationPrice) > 0
              ? `$${splitNumberByStep(positionData.liquidationPrice)}`
              : '--'
          }
        />
        <Row
          label={t(
            'page.perpsDetail.simpleAccount.estimatedLiquidationDistance'
          )}
          value={formatLiquidationGap(rawLiquidationPrice, markPrice)}
        />
      </div>

      <div className="bg-r-neutral-card1 rounded-[8px] px-16 py-12">
        <CardTitle>{t('page.perpsDetail.simpleAccount.tpSl')}</CardTitle>
        <Row
          label={t('page.perpsDetail.simpleAccount.takeProfitPrice')}
          value={
            <EditTpSlTag
              {...tpSlTagProps}
              actionType="tp"
              initTpOrSlPrice={tpPrice || ''}
              estimatedPnl={expectedPnl(tpPrice)}
              handleCancelAutoClose={() => onCancelAutoClose('tp')}
              handleSetAutoClose={(price: string) =>
                onSetAutoClose({ tpTriggerPx: price, slTriggerPx: '' })
              }
            />
          }
        />
        <Row
          label={t('page.perpsDetail.simpleAccount.stopLossPrice')}
          value={
            <EditTpSlTag
              {...tpSlTagProps}
              actionType="sl"
              initTpOrSlPrice={slPrice || ''}
              estimatedPnl={expectedPnl(slPrice)}
              handleCancelAutoClose={() => onCancelAutoClose('sl')}
              handleSetAutoClose={(price: string) =>
                onSetAutoClose({ tpTriggerPx: '', slTriggerPx: price })
              }
            />
          }
        />
      </div>

      <div className="bg-r-neutral-card1 rounded-[8px] px-16 py-12">
        <CardTitle>{t('page.perpsDetail.simpleAccount.funding')}</CardTitle>
        <Row
          label={
            <DashedUnderlineText
              needCursor={false}
              tooltipText={t('page.perps.singleCoin.fundingTips')}
            >
              {t('page.perpsDetail.simpleAccount.nextFundingRate')}
            </DashedUnderlineText>
          }
          value={
            nextFundingRate != null
              ? formatPercent(Number(nextFundingRate), 4)
              : '--'
          }
        />
        <Row
          label={
            <DashedUnderlineText
              needCursor={false}
              tooltipText={() => (
                <Trans
                  i18nKey="page.perpsPro.userInfo.tab.fundingTipsBold"
                  components={{ bold: <span className="font-bold" /> }}
                />
              )}
            >
              {isFundingGains
                ? t('page.perps.fundingGains')
                : t('page.perps.fundingPayments')}
            </DashedUnderlineText>
          }
          value={
            <span
              className={
                isFundingGains ? 'text-r-green-default' : 'text-r-red-default'
              }
            >
              {handleDisplayFundingPayments(
                positionData.fundingPayments || '0'
              )}
            </span>
          }
        />
      </div>
    </div>
  );
};
