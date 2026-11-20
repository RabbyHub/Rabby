import BigNumber from 'bignumber.js';
import React, { useEffect, useState } from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './gasCardStyles.module.css';

export const GasCardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    $disabled?: boolean;
  }
>(({ $disabled, className, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn(
      $disabled ? styles.gasCardBodyDisabled : styles.gasCardBody,
      className
    )}
    {...rest}
  />
));

export const GasPriceDesc = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn(
      'mt-20 text-13 text-r-neutral-body flex flex-col gap-12 leading-[16px]',
      className
    )}
    {...rest}
  />
));

export const GasPriceBold = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...rest }, ref) => (
  <span
    ref={ref}
    className={cn('font-medium text-r-neutral-title1 text-13', className)}
    {...rest}
  />
));

export const useExplainGas = ({
  price,
  method,
  value,
}: {
  price: number;
  method: (
    price: number
  ) => Promise<{
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  }>;
  value: {
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  };
}) => {
  const [result, setResult] = useState<{
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  }>(value);

  useEffect(() => {
    let stale = false;
    method(price).then((res) => {
      if (!stale) setResult(res);
    });
    return () => {
      stale = true;
    };
  }, [method, price]);

  return result;
};
