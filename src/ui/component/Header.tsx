import React from 'react';
import { useHistory } from 'react-router-dom';
import { Icon } from 'ui/component';

interface HeaderProps {
  title: string;
  subTitle?: string;
  showClose?: boolean;
  onCloseClick?: () => void;
  className?: string;
}

const Header = ({
  title,
  subTitle,
  showClose = true,
  onCloseClick,
}: HeaderProps) => {
  const history = useHistory();

  const handleClose = () => {
    if (onCloseClick) {
      onCloseClick();

      return;
    }

    history.goBack();
  };

  return (
    <div className="flex items-center mb-6">
      <div className="flex-1">
        <div className="font-bold text-24">{title}</div>
        <div className="text-14 text-gray-light">{subTitle}</div>
      </div>
      {showClose && !subTitle && <Icon type="cross" onClick={handleClose} />}
    </div>
  );
};

export default Header;
