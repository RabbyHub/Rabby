import React, { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import IconBack from 'ui/assets/back.svg';
import './style.less';

const PageHeader = ({
  children,
  canBack = true,
  rightSlot,
  onBack,
  forceShowBack,
  fixed = false,
}: {
  children: ReactNode;
  canBack?: boolean;
  rightSlot?: ReactNode;
  onBack?(): void;
  forceShowBack?: boolean;
  fixed?: boolean;
}) => {
  const history = useHistory();

  const Content = (
    <div className="page-header">
      {(forceShowBack || (canBack && history.length > 1)) && (
        <img
          src={IconBack}
          className="icon icon-back"
          onClick={onBack || (() => history.goBack())}
        />
      )}
      <div className="header-content">{children}</div>
      {rightSlot && rightSlot}
    </div>
  );
  return fixed ? (
    <div className="page-header-container">
      <div className="page-header-wrap">{Content}</div>
    </div>
  ) : (
    Content
  );
};

export default PageHeader;
