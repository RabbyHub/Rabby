import React from 'react';
import cx from 'clsx';

export interface StrayHeaderProps {
  title: string;
  subTitle?: string;
  center?: boolean;
  className?: string;
}

const Header = ({ title, subTitle, center = false }: StrayHeaderProps) => {
  return (
    <div className={cx('mb-12', center && 'text-center')}>
      <div className="text-24 font-bold">{title}</div>
      <div className="text-14 text-gray-content">{subTitle}</div>
    </div>
  );
};

export default Header;
