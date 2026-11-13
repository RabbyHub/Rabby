import { lazyComponent } from '@/ui/utils/lazyComponent';

// recharts is ~180K; load the chart only when a token detail shows it
export const TokenCharts = lazyComponent(() =>
  import('./index').then((m) => m.TokenCharts)
);
