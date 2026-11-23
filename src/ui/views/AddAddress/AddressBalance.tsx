import React from 'react';
import { useInViewport } from 'ahooks';
import { formatUsdValue } from '@/ui/utils/number';
import type { createAddressBalanceLoader } from '@/ui/utils/addressBalanceLoader';

type BalanceState =
  | { address: string; status: 'loading' | 'error' }
  | { address: string; status: 'success'; value: number };

export const AddressBalance = ({
  address,
  loader,
}: {
  address: string;
  loader: ReturnType<typeof createAddressBalanceLoader>;
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  // Virtuoso also mounts overscan rows; only fetch when the amount is visible.
  const [inViewport] = useInViewport(ref);
  const [state, setState] = React.useState<BalanceState>({
    address,
    status: 'loading',
  });

  React.useEffect(() => {
    if (!inViewport || !address) return;

    const controller = new AbortController();
    setState((previous) =>
      previous.address === address && previous.status === 'success'
        ? previous
        : { address, status: 'loading' }
    );

    loader.load(address, controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) {
          setState({ address, status: 'success', value });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setState({ address, status: 'error' });
        }
      }
    );

    return () => controller.abort();
  }, [address, inViewport, loader]);

  const currentState = state.address === address ? state : undefined;
  const loading = !currentState || currentState.status === 'loading';

  return (
    <span
      ref={ref}
      className="text-[13px] leading-normal text-r-neutral-foot relative top-1"
      aria-busy={loading}
    >
      {loading ? (
        <span className="inline-block h-[14px] w-[36px] rounded-[4px] bg-r-neutral-card-2 animate-pulse" />
      ) : currentState?.status === 'success' ? (
        formatUsdValue(currentState.value)
      ) : (
        '—'
      )}
    </span>
  );
};
