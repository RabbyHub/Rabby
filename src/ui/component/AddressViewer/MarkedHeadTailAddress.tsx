import clsx from 'clsx';
import React, { useMemo } from 'react';
import styled from 'styled-components';

const AddressText = styled.span`
  font-weight: 500;
  color: var(--r-neutral-title1);
`;

export default function MarkedHeadTailAddress({
  address,
  className,
}: {
  address?: string;
  className?: string;
}) {
  const addressSplit = useMemo(() => {
    if (!address) {
      return [];
    }
    const prefix = address.slice(0, 8);
    const middle = address.slice(8, -6);
    const suffix = address.slice(-6);

    return [prefix, middle, suffix];
  }, [address]);

  if (!address) return null;

  return (
    <span
      className={clsx('text-[16px] inline-block w-full text-center', className)}
    >
      <AddressText>{addressSplit[0]}</AddressText>
      <span className="text-r-neutral-foot">{addressSplit[1]}</span>
      <AddressText>{addressSplit[2]}</AddressText>
    </span>
  );
}
