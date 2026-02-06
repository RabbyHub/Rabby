import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Skeleton, Tooltip } from 'antd';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';
import styled, { createGlobalStyle } from 'styled-components';
import { getHealthStatusColor, isHFEmpty } from '../../utils';
import { HF_COLOR_GOOD_THRESHOLD } from '../../utils/constant';
import { estDaily, formatApy } from '../../utils/format';
import { getHealthFactorText } from '../../utils/health';
import RightMarketTabInfo from './RightTag';
import { HFDescription } from '../HFDescription';
import { getApyColor } from '../../utils/apy';
import { useLendingIsLoading } from '../../hooks';
import { HealthTip } from './HealthTip';

const HealthyBadge = styled.div`
  background: var(--rb-light-green-light-1);
  color: white;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
`;

export const InfoTitle = styled.span`
  color: var(--r-neutral-foot, #707280);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
`;

const InfoValue = styled.span`
  color: var(--r-neutral-title-1, #192945);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
`;

const LendingHfTooltipStyle = createGlobalStyle`
  .lending-hf-tooltip {
    max-width: fit-content !important;
    .ant-tooltip-inner {
      background-color: var(--lending-hf-tooltip-bg) !important;
      border-radius: 4px !important;
      display: flex;
      align-items: center;
    }
    .ant-tooltip-arrow-content {
      background-color: var(--lending-hf-tooltip-bg) !important;
    }
  }
`;

interface SummaryItemProps {
  netWorth: string;
  supplied: string;
  borrowed: string;
  netApy: number;
  healthFactor: string;
}

const SummaryBarSkeleton: React.FC = () => (
  <div className="flex items-center gap-[24px]">
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton.Button
        key={index}
        className="h-[17px] block rounded-[4px]"
        style={{ width: 82 }}
      />
    ))}
  </div>
);

export const SummaryBar: React.FC<SummaryItemProps> = ({
  netWorth,
  supplied,
  borrowed,
  netApy,
  healthFactor,
}) => {
  const { t } = useTranslation();
  const [hfDescVisible, setHfDescVisible] = useState(false);
  const { loading } = useLendingIsLoading();
  const healthStatus = useMemo(() => {
    const numHF = Number(healthFactor || '0');
    const hfColorInfo = getHealthStatusColor(numHF);
    const label =
      numHF < HF_COLOR_GOOD_THRESHOLD
        ? t('page.lending.summary.risky')
        : t('page.lending.summary.healthy');
    return {
      ...hfColorInfo,
      label,
    };
  }, [healthFactor, t]);

  const netApyText = useMemo(() => {
    const apyAbs = Math.abs(Number(netApy || 0));
    const formatted = formatApy(apyAbs);
    if (!apyAbs) {
      return '0.00%';
    }
    return `${netApy > 0 ? '+' : '-'}${formatted}`;
  }, [netApy]);

  const estDailyText = useMemo(() => {
    return estDaily(netWorth, netApy);
  }, [netApy, netWorth]);

  const onlySupply = useMemo(() => {
    return (
      Number(borrowed || '0') === 0 && isHFEmpty(Number(healthFactor || '0'))
    );
  }, [borrowed, healthFactor]);

  return (
    <div className="border-t border-solid border-rb-neutral-line">
      <LendingHfTooltipStyle />
      <div className="h-[40px] flex items-center px-[20px]">
        {loading ? (
          <SummaryBarSkeleton />
        ) : (
          <div className="flex items-center gap-[24px] w-full">
            {onlySupply ? (
              <>
                <div className="flex items-center gap-[6px]">
                  <InfoTitle>{t('page.lending.summary.netWorth')}:</InfoTitle>
                  <InfoValue>
                    {formatUsdValue(netWorth, BigNumber.ROUND_DOWN)}
                  </InfoValue>
                </div>
                <div className="flex items-center gap-[6px]">
                  <InfoTitle>
                    {t('page.lending.summary.totalSupplied')}:
                  </InfoTitle>
                  <InfoValue>
                    {formatUsdValue(supplied, BigNumber.ROUND_DOWN)}
                  </InfoValue>
                </div>
                <div className="flex items-center gap-[8px]">
                  <InfoTitle>{t('page.lending.summary.netApy')}:</InfoTitle>
                  <InfoValue
                    style={{
                      color: getApyColor(netApy),
                    }}
                  >
                    {netApyText}
                  </InfoValue>
                </div>

                <div className="flex items-center gap-[8px]">
                  <InfoTitle>
                    {t('page.lending.summary.estDailyEarnings')}:
                  </InfoTitle>
                  <InfoValue>{estDailyText}</InfoValue>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-[6px]">
                  <InfoTitle>{t('page.lending.summary.netWorth')}:</InfoTitle>
                  <InfoValue>
                    {formatUsdValue(netWorth, BigNumber.ROUND_DOWN)}
                  </InfoValue>
                </div>

                <div className="flex items-center gap-[6px]">
                  <InfoTitle>
                    {t('page.lending.summary.totalBorrowed')}:
                  </InfoTitle>
                  <InfoValue>
                    {formatUsdValue(borrowed, BigNumber.ROUND_DOWN)}
                  </InfoValue>
                </div>

                <div className="flex items-center gap-[6px]">
                  <InfoTitle>
                    {t('page.lending.summary.totalSupplied')}:
                  </InfoTitle>
                  <InfoValue>
                    {formatUsdValue(supplied, BigNumber.ROUND_DOWN)}
                  </InfoValue>
                </div>

                <Tooltip
                  overlay={
                    <HealthTip
                      onMoreClick={() => setHfDescVisible(true)}
                      healthFactor={healthFactor}
                    />
                  }
                  overlayClassName="rectangle lending-hf-tooltip max-w-fit"
                  overlayStyle={
                    {
                      '--lending-hf-tooltip-bg': healthStatus.tooltipBgColor,
                    } as React.CSSProperties
                  }
                >
                  <div className="flex items-center gap-[6px]">
                    <div className="flex items-center gap-[2px]">
                      <InfoTitle>
                        {t('page.lending.summary.healthFactor')}
                      </InfoTitle>

                      <RcIconInfo
                        width={12}
                        height={12}
                        className="cursor-pointer text-rb-neutral-foot ml-[2px]"
                      />
                    </div>
                    <InfoValue style={{ color: healthStatus.color }}>
                      {getHealthFactorText(healthFactor)}
                    </InfoValue>
                    <HealthyBadge
                      style={{
                        backgroundColor: healthStatus.backgroundColor,
                        color: healthStatus.textColor,
                      }}
                    >
                      {healthStatus.label}
                    </HealthyBadge>
                  </div>
                </Tooltip>

                <HFDescription
                  visible={hfDescVisible}
                  hf={healthFactor}
                  onClose={() => setHfDescVisible(false)}
                />

                <div className="flex items-center gap-[8px]">
                  <InfoTitle>{t('page.lending.summary.netApy')}:</InfoTitle>
                  <InfoValue
                    style={{
                      color: getApyColor(netApy),
                    }}
                  >
                    {netApyText}
                  </InfoValue>
                </div>

                <div className="flex items-center gap-[8px]">
                  <InfoTitle>
                    {t('page.lending.summary.estDailyEarnings')}:
                  </InfoTitle>
                  <InfoValue>{estDailyText}</InfoValue>
                </div>
              </>
            )}
            <RightMarketTabInfo />
          </div>
        )}
      </div>
    </div>
  );
};
