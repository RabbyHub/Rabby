import React from 'react';
import cx from 'clsx';

export interface StrayHeaderProps {
  title?: string;
  secondTitle?: string;
  subTitle?: string;
  center?: boolean;
  className?: string;
}

const Header = ({
  title,
  subTitle,
  secondTitle,
  center = false,
  className,
}: StrayHeaderProps) => {
  return (
    <div className={cx(className, center && 'text-center')}>
      {title && (
        <div className="text-20 font-bold text-r-neutral-title-1">{title}</div>
      )}
      {secondTitle && <div className="text-20 font-medium">{secondTitle}</div>}
      {subTitle && (
        <div className="text-14 text-r-neutral-foot">{subTitle}</div>
      )}
    </div>
  );
};

export default Header;
