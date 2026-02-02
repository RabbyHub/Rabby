import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Tooltip } from 'antd';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';
import styled from 'styled-components';
import { getHealthStatusColor, isHFEmpty } from '../../utils';
import { HF_COLOR_GOOD_THRESHOLD } from '../../utils/constant';
import { estDaily, formatApy } from '../../utils/format';
import { getHealthFactorText } from '../../utils/health';
import RightMarketTabInfo from './RightTag';
import { HFDescription } from '../HFDescription';

const SummaryBarContainer = styled.div`
  /*  */
`;

const HealthyBadge = styled.div`
  background: var(--rb-light-green-light-1);
  color: var(--r-green-default);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
`;

const InfoTitle = styled.span`
  color: var(--r-neutral-foot, #707280);
  font-size: 13px;
  font-weight: 400;
  line-height: 16px;
`;

const InfoValue = styled.span`
  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;
  line-height: 16px;
  font-weight: 500;
`;

interface SummaryItemProps {
  netWorth: string;
  supplied: string;
  borrowed: string;
  netApy: number;
  healthFactor: string;
}

export const SummaryBar: React.FC<SummaryItemProps> = ({
  netWorth,
  supplied,
  borrowed,
  netApy,
  healthFactor,
}) => {
  const { t } = useTranslation();
  const [hfDescVisible, setHfDescVisible] = useState(false);

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
      <SummaryBarContainer className="h-[56px] flex items-center px-[24px]">
        <div className="flex items-center gap-[24px] w-full">
          <div className="flex items-center gap-[6px]">
            <InfoTitle>{t('page.lending.summary.netWorth')}:</InfoTitle>
            <InfoValue>
              {formatUsdValue(netWorth, BigNumber.ROUND_DOWN)}
            </InfoValue>
          </div>

          <div className="flex items-center gap-[6px]">
            <InfoTitle>{t('page.lending.summary.totalBorrowed')}:</InfoTitle>
            <InfoValue>
              {formatUsdValue(borrowed, BigNumber.ROUND_DOWN)}
            </InfoValue>
          </div>

          <div className="flex items-center gap-[6px]">
            <InfoTitle>{t('page.lending.summary.totalSupplied')}:</InfoTitle>
            <InfoValue>
              {formatUsdValue(supplied, BigNumber.ROUND_DOWN)}
            </InfoValue>
          </div>

          <div className="flex items-center gap-[6px]">
            <InfoTitle>{t('page.lending.summary.healthFactor')}</InfoTitle>
            <Tooltip title={t('page.lending.summary.healthFactorTip')}>
              <RcIconInfo
                width={12}
                height={12}
                className="cursor-pointer text-rb-neutral-foot ml-[2px]"
                onClick={() => setHfDescVisible(true)}
              />
            </Tooltip>
            <InfoValue style={{ color: healthStatus.color }}>
              {getHealthFactorText(healthFactor)}
            </InfoValue>
            <HealthyBadge
              style={{
                color: healthStatus.color,
                backgroundColor: healthStatus.backgroundColor,
              }}
            >
              {healthStatus.label}
            </HealthyBadge>
            <HFDescription
              visible={hfDescVisible}
              hf={healthFactor}
              onClose={() => setHfDescVisible(false)}
            />
          </div>

          <div className="flex items-center gap-[8px]">
            <InfoTitle>{t('page.lending.summary.netApy')}:</InfoTitle>
            <InfoValue>{(netApy * 100).toFixed(1)}%</InfoValue>
          </div>

          <div className="flex items-center gap-[8px]">
            <InfoTitle>{t('page.lending.summary.estDailyEarnings')}:</InfoTitle>
            <InfoValue>{estDailyText}</InfoValue>
          </div>
          <RightMarketTabInfo />
        </div>
      </SummaryBarContainer>
    </div>
  );
};
