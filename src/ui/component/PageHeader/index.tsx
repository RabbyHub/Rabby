import clsx from 'clsx';
import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import IconBack from 'ui/assets/back.svg';
import IconClose from 'ui/assets/component/close.svg';
import './style.less';

const PageHeader = ({
  children,
  canBack = true,
  rightSlot,
  onBack,
  forceShowBack,
  fixed = false,
  invertBack = false,
  className = '',
  closeable = false,
  onClose,
  closeCn,
}: {
  children: ReactNode;
  canBack?: boolean;
  rightSlot?: ReactNode;
  onBack?(): void;
  onClose?(): void;
  forceShowBack?: boolean;
  fixed?: boolean;
  invertBack?: boolean;
  className?: string;
  closeable?: boolean;
  closeCn?: string;
}) => {
  const navigate = useNavigate();

  const Content = (
    <div className={clsx('page-header', !fixed && className)}>
      {(forceShowBack || (canBack && navigate.length > 1)) && (
        <img
          src={IconBack}
          className={clsx('icon icon-back', invertBack && 'filter invert')}
          onClick={onBack || (() => navigate(-1))}
        />
      )}
      <div className="header-content">{children}</div>
      {rightSlot && rightSlot}
      {closeable && (
        <img
          src={IconClose}
          className={clsx('icon-close', invertBack && 'filter invert', closeCn)}
          onClick={onClose || (() => navigate(-1))}
        />
      )}
    </div>
  );
  return fixed ? (
    <div className={clsx('page-header-container', className)}>
      <div className="page-header-wrap">{Content}</div>
    </div>
  ) : (
    Content
  );
};

export default PageHeader;
