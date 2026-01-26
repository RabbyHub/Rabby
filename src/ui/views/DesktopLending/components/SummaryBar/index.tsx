import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Tooltip } from 'antd';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';
import styled from 'styled-components';

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

const EthCorrelatedTagWrapper = styled.div`
  background: white;
  border-radius: 6px;
  padding: 1.5px;
  background: linear-gradient(135deg, #9ae8ff 0%, #cb8eff 100%);
`;

const EthCorrelatedTag = styled.div`
  background: white;
  border-radius: 5px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
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

export const SummaryBar: React.FC = () => {
  const { t } = useTranslation();

  const netWorth = 1023;
  const totalBorrowed = 2224;
  const totalSupplied = 12224;
  const healthFactor = 16.84;
  const netApy = 0.041;
  const estDailyEarnings = 4.5;
  const isHealthy = healthFactor > 1.5;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-solid border-rb-neutral-line">
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
              {formatUsdValue(totalBorrowed, BigNumber.ROUND_DOWN)}
            </InfoValue>
          </div>

          <div className="flex items-center gap-[6px]">
            <InfoTitle>{t('page.lending.summary.totalSupplied')}:</InfoTitle>
            <InfoValue>
              {formatUsdValue(totalSupplied, BigNumber.ROUND_DOWN)}
            </InfoValue>
          </div>

          <div className="flex items-center gap-[6px]">
            <InfoTitle>{t('page.lending.summary.healthFactor')}</InfoTitle>
            <Tooltip title={t('page.lending.summary.healthFactorTip')}>
              <RcIconInfo
                width={12}
                height={12}
                className="cursor-pointer text-rb-neutral-foot ml-[2px]"
              />
            </Tooltip>
            <InfoValue>{healthFactor.toFixed(2)}</InfoValue>
            {isHealthy && (
              <HealthyBadge>{t('page.lending.summary.healthy')}</HealthyBadge>
            )}
          </div>

          <div className="flex items-center gap-[8px]">
            <InfoTitle>{t('page.lending.summary.netApy')}:</InfoTitle>
            <InfoValue>{(netApy * 100).toFixed(1)}%</InfoValue>
          </div>

          <div className="flex items-center gap-[8px]">
            <InfoTitle>{t('page.lending.summary.estDailyEarnings')}:</InfoTitle>
            <InfoValue>
              +{formatUsdValue(estDailyEarnings, BigNumber.ROUND_DOWN)}
            </InfoValue>
          </div>

          <div className="">
            <EthCorrelatedTagWrapper>
              <EthCorrelatedTag>
                <span className="text-[12px] leading-[14px] font-medium text-[#9AE8FF]">
                  +
                </span>
                <span className="text-[12px] leading-[14px] font-medium">
                  <span className="text-[#9AE8FF]">ETH</span>
                  <span className="text-[#CB8EFF]"> CORRELATED</span>
                </span>
                <Tooltip title={t('page.lending.summary.ethCorrelatedTip')}>
                  <RcIconInfo
                    width={12}
                    height={12}
                    className="cursor-pointer text-[#CB8EFF]"
                  />
                </Tooltip>
              </EthCorrelatedTag>
            </EthCorrelatedTagWrapper>
          </div>
        </div>
      </SummaryBarContainer>
    </div>
  );
};
