import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import { PopupDetailProps } from '../../types';
import { isHFEmpty } from '../../utils';
import { getSupplyCapData } from '../../utils/supply';
import {
  getAssetCollateralType,
  getCollateralState,
} from '../../utils/collateral';
import { formatApy } from '../../utils/format';
import { getHealthFactorText } from '../../utils/health';
import { formatUsdValue } from '@/ui/utils/number';
import { IsolateTag } from '../IsolateTag';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';

const formatNetworth = (num: number) => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return formatUsdValue(num);
};

export const SupplyOverView: React.FC<
  PopupDetailProps & {
    afterHF?: string;
    afterAvailable?: string;
  }
> = ({ reserve, userSummary, afterHF, afterAvailable }) => {
  const { t } = useTranslation();
  const { availableBorrowsUSD = '0', healthFactor = '0' } = userSummary;

  const availableText = useMemo(
    () => formatNetworth(Number(availableBorrowsUSD || '0')),
    [availableBorrowsUSD]
  );

  const apyText = useMemo(
    () => formatApy(Number(reserve?.reserve?.supplyAPY || '0')),
    [reserve?.reserve?.supplyAPY]
  );

  const [canBeEnabledAsCollateral, collateralState] = useMemo(() => {
    const { supplyCapReached } = getSupplyCapData(reserve);
    const collateralType = getAssetCollateralType(
      reserve,
      userSummary.totalCollateralUSD,
      userSummary.isInIsolationMode,
      supplyCapReached
    );
    return getCollateralState({ collateralType });
  }, [reserve, userSummary]);

  const showHF = !isHFEmpty(Number(healthFactor || '0'));

  return (
    <div className="w-full mt-16">
      <h3 className="text-[13px] leading-[15px] text-r-neutral-foot mb-8">
        {t('page.lending.popup.title')}
      </h3>
      <div className="rounded-[8px] bg-rb-neutral-card-1">
        <div className="flex items-center justify-between p-16">
          <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
            {t('page.lending.supplyDetail.availableToBorrow')}
          </span>
          <div className="flex items-center flex-1 justify-end min-w-0">
            <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1 text-right truncate">
              {afterAvailable
                ? `${availableText} → ${formatNetworth(
                    Number(afterAvailable || '0')
                  )}`
                : availableText}
            </span>
            <Tooltip title={t('page.lending.modalDesc.availableToBorrowDesc')}>
              <RcIconInfo
                width={12}
                height={12}
                className="cursor-pointer text-rb-neutral-foot ml-[4px]"
              />
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center justify-between p-16">
          <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
            {t('page.lending.supplyDetail.supplyAPY')}
          </span>
          <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
            {apyText}
          </span>
        </div>

        <div className="flex items-center justify-between p-16">
          <div className="flex items-center gap-1">
            <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
              {t('page.lending.supplyDetail.collateralization')}
            </span>
            {reserve?.reserve?.isIsolated && <IsolateTag />}
          </div>
          <span
            className={`text-[13px] leading-[15px] font-medium ${
              canBeEnabledAsCollateral
                ? 'text-rb-green-default'
                : 'text-rb-red-default'
            }`}
          >
            • {collateralState}
          </span>
        </div>

        {showHF && (
          <>
            <div className="flex items-center justify-between p-16">
              <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
                {t('page.lending.hfTitle')}
              </span>
              <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
                {afterHF ? (
                  <>
                    {getHealthFactorText(healthFactor)} →{' '}
                    {getHealthFactorText(afterHF)}
                  </>
                ) : (
                  getHealthFactorText(healthFactor)
                )}
              </span>
            </div>
            <div className="flex justify-end p-16 pt-0">
              <span className="text-[12px] leading-[15px] text-r-neutral-foot">
                {t('page.lending.popup.liquidationAt')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
