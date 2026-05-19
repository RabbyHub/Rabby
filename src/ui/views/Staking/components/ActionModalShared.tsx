import React from 'react';

import { BackIcon } from '../icons';

export const ActionPopupTitle = ({
  title,
  onBack,
  className,
  backClassName,
}: {
  title: string;
  onBack: () => void;
  className: string;
  backClassName: string;
}) => (
  <div className={className}>
    <button
      type="button"
      className={backClassName}
      onClick={onBack}
      aria-label="Back"
    >
      <BackIcon />
    </button>
    <span>{title}</span>
  </div>
);
