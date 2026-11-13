import { lazyComponent } from '@/ui/utils/lazyComponent';

// lottie-web is ~300K; load it only when an animation is actually rendered
export const LazyLottie = lazyComponent(() =>
  import('lottie-react').then((m) => m.default)
);
