import React from 'react';
import clsx from 'clsx';
import { SvgIconLoading } from 'ui/assets';
import './style.less';

const LoadingOverlay = ({ hidden }: { hidden: boolean }) => {
  return (
    <div className={clsx('loading-overlay', { hidden })}>
      <div className="loading-overlay__content">
        <SvgIconLoading className="icon icon-loading" />
        <p>Loading data...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
