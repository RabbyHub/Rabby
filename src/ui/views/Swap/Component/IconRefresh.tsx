import clsx from 'clsx';
import React, { memo } from 'react';
import styles from './IconRefresh.module.css';

interface IconRefreshProps extends React.ComponentPropsWithoutRef<'svg'> {
  spinning?: boolean;
}

export const IconRefresh = memo((props: IconRefreshProps) => {
  const { className, spinning = false, ...other } = props;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="transparent"
      className={clsx(
        styles.refreshSvg,
        spinning && styles.animating,
        'arrow-loading cursor-pointer',
        className || 'text-r-blue-default'
      )}
      {...other}
    >
      <path
        d="M1.40002 6.99844C1.40002 10.0912 3.90723 12.5984 7.00002 12.5984C10.0928 12.5984 12.6 10.0912 12.6 6.99844C12.6 3.90564 10.0928 1.39844 7.00002 1.39844"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
