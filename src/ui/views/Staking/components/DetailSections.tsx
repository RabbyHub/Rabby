import { lazyComponent } from '@/ui/utils/lazyComponent';

export type { DetailTabKey, StakingAction } from './DetailSectionUtils';
export { getActionSupported, getVisualPool } from './DetailSectionUtils';
// lazy so recharts loads only when the staking detail summary renders
export const DetailSummary = lazyComponent(() =>
  import('./DetailSummarySection').then((m) => m.DetailSummary)
);
export { AboutTab } from './DetailAboutSection';
export { SecurityTab } from './DetailSecuritySection';
export { PortfolioTab } from './DetailPortfolioSection';
export { BottomActionBar, DetailTabs } from './DetailControls';
