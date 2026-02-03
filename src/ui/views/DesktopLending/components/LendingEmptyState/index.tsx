import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLendingSummary, useSelectedMarket } from '../../hooks';
import { isSameAddress } from '@/ui/utils';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import { CustomMarket } from '../../config/market';
import { SupplyItem } from '../SupplyListModal/SupplyItem';
import { DisplayPoolReserveInfo } from '../../types';

const EmptyStateContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--rb-neutral-bg-1, #f7f7fa);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 200px;
    height: 200px;
    background: radial-gradient(
      circle,
      rgba(235, 237, 240, 0.3) 0%,
      transparent 70%
    );
    border-radius: 50%;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 200px;
    height: 200px;
    background: radial-gradient(
      circle,
      rgba(235, 237, 240, 0.3) 0%,
      transparent 70%
    );
    border-radius: 50%;
    pointer-events: none;
  }
`;

const PoweredByText = styled.div`
  position: relative;
  z-index: 1;
  font-size: 12px;
  line-height: 16px;
  color: var(--r-neutral-foot, #6d6d78);
  margin-bottom: 40px;
  text-align: center;
`;

const IconContainer = styled.div`
  position: relative;
  z-index: 1;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--rb-brand-default, #7c66e3);
  border: 2px solid rgba(124, 102, 227, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const IconInner = styled.div`
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const IconArc = styled.div`
  width: 32px;
  height: 16px;
  border: 2px solid white;
  border-bottom: none;
  border-radius: 32px 32px 0 0;
  margin-bottom: 8px;
`;

const IconDots = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
`;

const IconDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
`;

const MainHeading = styled.h2`
  position: relative;
  z-index: 1;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: var(--r-neutral-title-1, #2c2c2c);
  margin: 0 0 8px 0;
  text-align: center;
`;

const SubText = styled.p`
  position: relative;
  z-index: 1;
  font-size: 14px;
  line-height: 20px;
  color: var(--r-neutral-foot, #a6a6a6);
  margin: 0;
  text-align: center;
  max-width: 400px;
  padding: 0 20px;
`;

export const LendingEmptyState: React.FC<{
  onSelect: (reserve: DisplayPoolReserveInfo) => void;
}> = ({ onSelect }) => {
  const { t } = useTranslation();
  const { displayPoolReserves } = useLendingSummary();
  const { marketKey } = useSelectedMarket();

  const filterReserves = useMemo(() => {
    return displayPoolReserves
      ?.filter((item) => {
        if (
          isSameAddress(
            item.reserve.underlyingAsset,
            API_ETH_MOCK_ADDRESS.toLowerCase()
          ) &&
          marketKey === CustomMarket.proto_mainnet_v3
        ) {
          return true;
        }
        return item.reserve.symbol.toLowerCase().includes('usd');
      })
      .sort((a, b) => {
        return (
          Number(b.reserve.totalLiquidityUSD || '0') -
          Number(a.reserve.totalLiquidityUSD || '0')
        );
      })
      .slice(0, 5);
  }, [displayPoolReserves, marketKey]);

  return (
    <div>
      <EmptyStateContainer>
        <PoweredByText>
          {t('page.lending.summary.empty.description')}
        </PoweredByText>
        <IconContainer>
          <IconInner>
            <IconArc />
            <IconDots>
              <IconDot />
              <IconDot />
            </IconDots>
          </IconInner>
        </IconContainer>
        <MainHeading>{t('page.lending.summary.empty.title')}</MainHeading>
        <SubText>{t('page.lending.summary.empty.endDesc')}</SubText>
      </EmptyStateContainer>
      {filterReserves.length > 0 && (
        <div className="px-20">
          <div className="mt-16 mb-2 flex items-center justify-between px-8">
            <span className="text-[14px] leading-[18px] text-r-neutral-foot flex-1">
              {t('page.lending.list.headers.token')}
            </span>
            <span className="text-[14px] leading-[18px] text-r-neutral-foot w-[80px] text-right">
              {t('page.lending.tvl')}
            </span>
            <span className="text-[14px] leading-[18px] text-r-neutral-foot w-[80px] text-right">
              {t('page.lending.apy')}
            </span>
            <span className="w-[80px] flex-shrink-0" />
          </div>
          {filterReserves.map((item) => (
            <SupplyItem
              key={item.reserve.underlyingAsset}
              data={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
