import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLendingSummary } from '../../hooks';
import { isSameAddress } from '@/ui/utils';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import { CustomMarket } from '../../config/market';
import { SupplyItem } from '../SupplyListModal/SupplyItem';
import { DisplayPoolReserveInfo } from '../../types';
import { ReactComponent as RcIconAAVE } from '@/ui/assets/lending/aave.svg';
import emptyBg from '@/ui/assets/lending/empty-bg.png';
import emptyDarkBg from '@/ui/assets/lending/empty-dark.png';
import { useSelectedMarket } from '../../hooks/market';
import clsx from 'clsx';
import { useThemeMode } from '@/ui/hooks/usePreference';

const EmptyStateContainer = styled.div<{ isDark: boolean }>`
  position: relative;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--rb-neutral-bg-2, #f7f7fa);
  background-image: ${({ isDark }) =>
    isDark ? `url(${emptyDarkBg})` : `url(${emptyBg})`};
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  overflow: hidden;
  margin: 0 20px;
  border-radius: 8px;

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
  font-weight: 500;
  color: var(--r-neutral-foot, #6d6d78);
  margin-bottom: 16px;
  text-align: center;
`;

const MainHeading = styled.h2`
  position: relative;
  z-index: 1;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: var(--r-neutral-title-1, #2c2c2c);
  margin: 18px 0 8px 0;
  text-align: center;
`;

const SubText = styled.p`
  position: relative;
  z-index: 1;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: var(--r-neutral-foot, #a6a6a6);
  margin: 0;
  text-align: center;
`;

export const LendingEmptyState: React.FC<{
  onSelect: (reserve: DisplayPoolReserveInfo) => void;
}> = ({ onSelect }) => {
  const { t } = useTranslation();
  const { displayPoolReserves } = useLendingSummary();
  const { marketKey } = useSelectedMarket();
  const { isDarkTheme } = useThemeMode();
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
      <EmptyStateContainer isDark={isDarkTheme}>
        <PoweredByText>
          {t('page.lending.summary.empty.description')}
        </PoweredByText>
        <RcIconAAVE width={59} height={59} />
        <MainHeading>{t('page.lending.summary.empty.title')}</MainHeading>
        <SubText>{t('page.lending.summary.empty.endDesc')}</SubText>
      </EmptyStateContainer>
      {filterReserves.length > 0 && (
        <div className="px-20">
          <div className="mt-16 mb-2 flex items-center justify-start px-16">
            <span className="text-[13px] leading-[15px] text-r-neutral-foot w-[150px]">
              {t('page.lending.list.headers.token')}
            </span>
            <span
              className={clsx(
                'text-[13px] leading-[15px] w-[150px] text-right',
                'text-r-neutral-foot'
              )}
            >
              {t('page.lending.tvl')}
            </span>
            <span
              className={clsx(
                'text-[13px] leading-[15px] w-[150px] text-right',
                'text-r-neutral-foot'
              )}
            >
              {t('page.lending.apy')}
            </span>
            <span
              className={clsx(
                'text-[13px] leading-[15px] w-[150px] text-right',
                'text-r-neutral-foot'
              )}
            >
              {t('page.lending.list.headers.my_assets')}
            </span>
            <span className="w-[80px] flex-shrink-0" />
          </div>
          {filterReserves.map((item) => (
            <SupplyItem
              key={item.reserve.underlyingAsset}
              className="bg-rb-neutral-bg-3 rounded-[12px]"
              data={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
