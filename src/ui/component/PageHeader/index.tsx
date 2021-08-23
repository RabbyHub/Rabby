import React, { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import IconBack from 'ui/assets/back.svg';
import './style.less';

const PageHeader = ({
  children,
  canBack = true,
  rightSlot,
}: {
  children: ReactNode;
  canBack?: boolean;
  rightSlot?: ReactNode;
}) => {
  const history = useHistory();

  return (
    <div className="page-header">
      {canBack && history.length > 0 && (
        <img
          src={IconBack}
          className="icon icon-back"
          onClick={() => history.goBack()}
        />
      )}
      <div className="header-content">{children}</div>
      {rightSlot && rightSlot}
    </div>
  );
};

export default PageHeader;
