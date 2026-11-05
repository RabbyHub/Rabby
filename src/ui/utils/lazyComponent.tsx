import React, { Suspense } from 'react';

/**
 * Loads a component (and its heavy dependencies) only when it first renders.
 * Each lazy component gets its own Suspense boundary, so only that spot waits
 * for the chunk instead of the whole route falling back to its spinner.
 */
export function lazyComponent<P extends object>(
  load: () => Promise<React.ComponentType<P>>,
  fallback: React.ReactNode = null
) {
  // React.lazy's ref-aware props type doesn't line up with a generic P
  const Lazy = (React.lazy(() =>
    load().then((Component) => ({ default: Component }))
  ) as unknown) as React.ComponentType<P>;
  const LazyComponent = (props: P) => (
    <Suspense fallback={fallback}>
      <Lazy {...props} />
    </Suspense>
  );
  return LazyComponent;
}
