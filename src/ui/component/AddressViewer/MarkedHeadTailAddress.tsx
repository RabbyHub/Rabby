import clsx from 'clsx';
import React, { useMemo } from 'react';
import styled from 'styled-components';

const AddressText = styled.span`
  font-weight: 500;
  color: var(--r-neutral-title1);
`;

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
      <AddressText>{addressSplit[0]}</AddressText>
      {dotsMiddle ? (
        <span className="text-r-neutral-foot">...</span>
      ) : (
        <span className="text-r-neutral-foot">{addressSplit[1]}</span>
      )}
      <AddressText>{addressSplit[2]}</AddressText>
    </span>
  );
}
