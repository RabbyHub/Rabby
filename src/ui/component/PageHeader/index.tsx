import clsx from 'clsx';
import React, { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import IconBack from 'ui/assets/back.svg';
import { ReactComponent as RcIconBackNew } from 'ui/assets/back-new.svg';
import { ReactComponent as RcIconClose } from 'ui/assets/component/close.svg';
import './style.less';
import ThemeIcon from '../ThemeMode/ThemeIcon';

const PageHeader = ({
  children,
  canBack = true,
  rightSlot,
  onBack,
  forceShowBack,
  fixed = false,
  wrapperClassName = '',
  invertBack = false,
  keepBackLightVersion = false,
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
  wrapperClassName?: string;
  invertBack?: boolean;
  keepBackLightVersion?: boolean;
  className?: string;
  closeable?: boolean;
  closeCn?: string;
}) => {
  const history = useHistory();

  const Content = (
    <div className={clsx('page-header', !fixed && className)}>
      {(forceShowBack || (canBack && history.length > 1)) && (
        <ThemeIcon
          src={keepBackLightVersion ? IconBack : RcIconBackNew}
          className={clsx('icon icon-back', invertBack && 'filter invert')}
          onClick={onBack || (() => history.goBack())}
        />
      )}
      <div className="header-content">{children}</div>
      {rightSlot && rightSlot}
      {closeable && (
        <ThemeIcon
          src={RcIconClose}
          className={clsx('icon-close', invertBack && 'filter invert', closeCn)}
          onClick={() => {
            if (onClose) {
              onClose();
            } else if (history.length > 1) {
              history.goBack();
            } else {
              history.replace('/');
            }
          }}
        />
      )}
    </div>
  );
  return fixed ? (
    <div className={clsx('page-header-container', className)}>
      <div className={clsx('page-header-wrap', wrapperClassName)}>
        {Content}
      </div>
    </div>
  ) : (
    Content
  );
};

export default PageHeader;
