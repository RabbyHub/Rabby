import clsx from 'clsx';
import React, { useMemo } from 'react';

export default function MarkedHeadTailAddress({
  headCount = 8,
  tailCount = 6,
  address,
  className,
  dotsMiddle = true,
}: {
  headCount?: number;
  tailCount?: number;
  address?: string;
  className?: string;
  dotsMiddle?: boolean;
}) {
  const addressSplit = useMemo(() => {
    if (!address) {
      return [];
    }
    const prefix = address.slice(0, headCount);
    const middle = address.slice(headCount, -tailCount);
    const suffix = address.slice(-tailCount);

    return [prefix, middle, suffix];
  }, [address, headCount, tailCount]);

  if (!address) return null;

  return (
    <span className={clsx('inline-block text-center', className)}>
      <span className="font-medium text-r-neutral-title1">
        {addressSplit[0]}
      </span>
      {dotsMiddle ? (
        <span className="text-r-neutral-foot">...</span>
      ) : (
        <span className="text-r-neutral-foot">{addressSplit[1]}</span>
      )}
      <span className="font-medium text-r-neutral-title1">
        {addressSplit[2]}
      </span>
    </span>
  );
}
