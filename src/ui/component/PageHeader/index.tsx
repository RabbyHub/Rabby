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
}: {
  children: ReactNode;
  canBack?: boolean;
  rightSlot?: ReactNode;
  onBack?(): void;
  forceShowBack?: boolean;
}) => {
  const history = useHistory();

  return (
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
};

export default PageHeader;
