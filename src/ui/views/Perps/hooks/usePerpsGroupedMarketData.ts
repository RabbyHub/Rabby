import { useMemo } from 'react';
import { sortBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import type { PerpTopTokenCategory } from '@rabby-wallet/rabby-api/dist/types';
import type { MarketData } from '@/ui/models/perps';
import {
  PerpsCategoryConfig,
  PerpsCategoryId,
} from '../constants/perpsCategories';

export type VisibleCategory = {
  id: PerpsCategoryId;
  cfg: PerpsCategoryConfig;
  items: MarketData[];
};

type BuiltinSpec = {
  id: PerpsCategoryId;
  i18nKey: string;
  homeLimit: number | null;
  showRankOnHome: boolean;
  showRankOnSearch: boolean;
};

const BUILTIN_SPECS: BuiltinSpec[] = [
  {
    id: 'favorite',
    i18nKey: 'page.perps.categories.favorite',
    homeLimit: null,
    showRankOnHome: false,
    showRankOnSearch: false,
  },
  {
    id: 'topVolume',
    i18nKey: 'page.perps.categories.topVolume',
    homeLimit: 5,
    showRankOnHome: true,
    showRankOnSearch: true,
  },
];

const sortByVolDesc = (list: MarketData[]) =>
  sortBy(list, (item) => -(Number(item.dayNtlVlm) || 0));

export function usePerpsGroupedMarketData(params: {
  marketData: MarketData[];
  favoriteMarkets: string[];
  backendCategories: PerpTopTokenCategory[];
}) {
  const { marketData, favoriteMarkets, backendCategories } = params;
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useMemo(() => {
    const configs: PerpsCategoryConfig[] = [
      ...BUILTIN_SPECS.map<PerpsCategoryConfig>((b) => ({
        id: b.id,
        label: t(b.i18nKey),
        homeLimit: b.homeLimit,
        showRankOnHome: b.showRankOnHome,
        showRankOnSearch: b.showRankOnSearch,
      })),
      ...(backendCategories ?? [])
        .filter((c) => !c.is_disable)
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
        .map<PerpsCategoryConfig>((c) => ({
          id: c.id,
          label: c.translations?.[currentLanguage] ?? c.name ?? c.id,
          homeLimit: 3,
          showRankOnHome: false,
          showRankOnSearch: false,
        })),
    ];

    const favSet = new Set(favoriteMarkets.map((s) => s.toUpperCase()));

    const volSorted = sortByVolDesc(marketData);

    const fullByCategory: Record<PerpsCategoryId, MarketData[]> = {};
    configs.forEach((cfg) => {
      if (cfg.id === 'favorite') {
        fullByCategory[cfg.id] = volSorted.filter((item) =>
          favSet.has(item.name.toUpperCase())
        );
      } else if (cfg.id === 'topVolume') {
        fullByCategory[cfg.id] = volSorted;
      } else {
        fullByCategory[cfg.id] = volSorted.filter(
          (item) => item.categoryId === cfg.id
        );
      }
    });

    const visibleHome: VisibleCategory[] = configs
      .map((cfg) => {
        const all = fullByCategory[cfg.id] ?? [];
        const items = cfg.homeLimit == null ? all : all.slice(0, cfg.homeLimit);
        return { id: cfg.id, cfg, items };
      })
      .filter((c) => c.items.length > 0);

    const visibleSearchTabs: VisibleCategory[] = configs
      .filter((cfg) => (fullByCategory[cfg.id] ?? []).length > 0)
      .map((cfg) => ({
        id: cfg.id,
        cfg,
        items: fullByCategory[cfg.id] ?? [],
      }));

    return { fullByCategory, visibleHome, visibleSearchTabs };
  }, [marketData, favoriteMarkets, backendCategories, t, currentLanguage]);
}
