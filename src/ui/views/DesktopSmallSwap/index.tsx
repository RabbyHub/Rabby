import { Account } from '@/background/service/preference';
import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch } from '@/ui/store';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import IconRabby from 'ui/assets/rabby.svg';

import { ChainPillList } from './components/ChainPillList';
import { LowValueTokenSelector } from './components/LowValueTokenSelector';
import { ReceiveSummary } from './components/ReceiveSummary';
import type {
  LowValueToken,
  ThresholdKey,
  ThresholdOption,
} from './components/LowValueTokenSelector';

const thresholds: ThresholdOption[] = [
  { key: '0.1', label: '<$0.1', value: 0.1 },
  { key: '1', label: '<$1', value: 1 },
  { key: '10', label: '<$10', value: 10 },
  { key: '100', label: '<$100', value: 100 },
];

const portfolioPills = [
  { chain: 'ETH', value: 774.38, accent: '#5C6CFF' },
  { chain: 'BNB', value: 289.62, accent: '#F0B90B' },
  { chain: 'BASE', value: 205.63, accent: '#0052FF' },
  { chain: 'OP', value: 49.31, accent: '#8B5CF6' },
  { chain: 'AVAX', value: 47.81, accent: '#E84142' },
  { chain: 'POL', value: 36.7, accent: '#EF4444' },
  { chain: 'BLAST', value: 33.31, accent: '#FACC15' },
  { chain: 'ARB', value: 32.31, accent: '#7C3AED' },
  { chain: 'LINEA', value: 31.31, accent: '#111827' },
  { chain: 'SCROLL', value: 30.31, accent: '#22C55E' },
  { chain: 'SCROLL1', value: 30.31, accent: '#22C55E' },
  { chain: 'SCROLL2', value: 30.31, accent: '#22C55E' },
  { chain: 'SCROLL3', value: 30.31, accent: '#22C55E' },
  { chain: 'SCROLL4', value: 30.31, accent: '#22C55E' },
  { chain: 'SCROLL5', value: 30.31, accent: '#22C55E' },
  { chain: 'SCROLL6', value: 30.31, accent: '#22C55E' },
];

const tokenRows: LowValueToken[] = [
  {
    id: 'asid',
    symbol: 'ASID1112',
    amount: '1,123,123',
    value: 8.88,
    tone: '#C79A2B',
    chainTone: '#5C6CFF',
  },
  {
    id: 'bnb',
    symbol: 'BNB',
    amount: '1,421',
    value: 2.22,
    tone: '#F0B90B',
    chainTone: '#5C6CFF',
  },
  {
    id: 'ats',
    symbol: 'ATS',
    amount: '1,555.3421',
    value: 1.22,
    tone: '#233B8F',
    chainTone: '#5C6CFF',
  },
  {
    id: 'bdcs',
    symbol: 'BDCS',
    amount: '11.3421',
    value: 0.1021,
    tone: '#263C90',
    chainTone: '#5C6CFF',
  },
  {
    id: 'tribe',
    symbol: 'TRIBE(fei...',
    amount: '1.3421',
    value: 0.03079,
    tone: '#1F3A8A',
    chainTone: '#5C6CFF',
  },
  {
    id: 'abc',
    symbol: 'ABC',
    amount: '21.3421',
    value: 0.0022,
    tone: '#294398',
    chainTone: '#5C6CFF',
  },
];

const formatUsd = (value: number) => {
  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  if (value < 1) {
    return `$${value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`;
  }
  return `$${value.toFixed(2)}`;
};

export const DesktopSmallSwap: React.FC<{
  isActive?: boolean;
  style?: React.CSSProperties;
}> = ({ isActive = true, style }) => {
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();

  const [activeThreshold, setActiveThreshold] = useState<ThresholdKey>('10');
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>(['asid']);

  const visibleTokens = useMemo(() => {
    const threshold =
      thresholds.find((item) => item.key === activeThreshold)?.value || 10;
    return tokenRows.filter((token) => token.value <= threshold);
  }, [activeThreshold]);

  const visibleTokenIds = useMemo(() => {
    return visibleTokens.map((token) => token.id);
  }, [visibleTokens]);

  useEffect(() => {
    setSelectedTokenIds((prev) =>
      prev.filter((id) => visibleTokenIds.includes(id))
    );
  }, [visibleTokenIds]);

  const allVisibleSelected =
    visibleTokens.length > 0 &&
    visibleTokens.every((token) => selectedTokenIds.includes(token.id));

  const selectedVisibleTokens = useMemo(() => {
    return visibleTokens.filter((token) => selectedTokenIds.includes(token.id));
  }, [selectedTokenIds, visibleTokens]);

  const totalValue = useMemo(() => {
    return selectedVisibleTokens.reduce((sum, token) => sum + token.value, 0);
  }, [selectedVisibleTokens]);

  const formattedPortfolioPills = useMemo(() => {
    return portfolioPills.map((pill) => ({
      ...pill,
      valueLabel: formatUsd(pill.value),
    }));
  }, []);

  const selectionState = useMemo<'none' | 'partial' | 'all'>(() => {
    if (!selectedVisibleTokens.length) {
      return 'none';
    }

    if (allVisibleSelected) {
      return 'all';
    }

    return 'partial';
  }, [allVisibleSelected, selectedVisibleTokens.length]);

  const toggleToken = (id: string) => {
    setSelectedTokenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllVisible = () => {
    setSelectedTokenIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter(
          (item) => !visibleTokens.some((token) => token.id === item)
        );
      }

      const next = new Set(prev);
      visibleTokens.forEach((token) => next.add(token.id));
      return Array.from(next);
    });
  };

  const handleAccountChange = (account: Account) => {
    dispatch.account.changeAccountAsync(account);
  };

  return (
    <div
      className={clsx(
        'h-full overflow-auto bg-r-neutral-bg-2',
        !isActive && 'hidden'
      )}
      style={style}
    >
      <div className="max-w-[1248px] min-w-[1200px] mx-auto px-[24px] pt-[32px] pb-[40px] min-h-full">
        <header className="flex items-start justify-between gap-[24px] mb-[32px]">
          <div className="min-w-0">
            <div className="flex items-center gap-[16px]">
              <img src={IconRabby} alt="Rabby" />
              <div className="space-y-[8px]">
                <div className="text-[24px] leading-[29px] font-semibold text-r-neutral-title1">
                  Dust converter
                </div>
                <div className="text-[15px] leading-[18px] text-r-neutral-foot">
                  Clear out low-value tokens on the blockchain to make your
                  asset list simpler!
                </div>
              </div>
            </div>
          </div>

          <DesktopAccountSelector
            value={currentAccount}
            onChange={handleAccountChange}
          />
        </header>

        <ChainPillList items={formattedPortfolioPills} activeIndex={0} />

        <div className="flex items-stretch justify-between gap-[24px]">
          <LowValueTokenSelector
            thresholds={thresholds}
            activeThreshold={activeThreshold}
            onThresholdChange={setActiveThreshold}
            visibleTokens={visibleTokens}
            selectedTokenIds={selectedTokenIds}
            selectionState={selectionState}
            selectedVisibleCount={selectedVisibleTokens.length}
            totalValue={totalValue}
            onToggleAllVisible={toggleAllVisible}
            onToggleToken={toggleToken}
            formatUsd={formatUsd}
          />

          <div className="w-[64px] flex items-center justify-center flex-shrink-0">
            <button
              type="button"
              className="w-[48px] h-[48px] rounded-full border border-rabby-neutral-line bg-r-neutral-card-1 flex items-center justify-center text-r-neutral-foot hover:text-r-blue-default hover:border-r-blue-default"
              style={{ boxShadow: '0 12px 24px rgba(25, 41, 69, 0.08)' }}
            >
              <RcIconArrowRightCC className="w-[18px] h-[18px]" />
            </button>
          </div>

          <ReceiveSummary totalValue={totalValue} formatUsd={formatUsd} />
        </div>
      </div>
    </div>
  );
};
