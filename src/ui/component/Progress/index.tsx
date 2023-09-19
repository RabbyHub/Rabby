import React from 'react';
import clsx from 'clsx';
import './index.less';

interface Props {
  percent: number;
}

export default function Progress({ percent }: Props) {
  return (
    <div className={clsx('progress')}>
      <div
        className={clsx('progress-bar')}
        style={{ '--percent': `${percent}%` }}
      ></div>
      <div className={clsx('progress-num')}>{percent}%</div>
    </div>
  );
}
