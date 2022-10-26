import React, { ReactNode } from 'react';
import './style.less';
import IconBack from 'ui/assets/icon-back.svg';

interface NavbarProps {
  back?: ReactNode | null;
  onBack?: () => void;
  children?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  desc?: ReactNode;
}

const Navbar = (props: NavbarProps) => {
  const { back, left, right, onBack, children, desc } = props;
  return (
    <div className="rabby-navbar">
      <div className="rabby-navbar-container">
        <div className="rabby-navbar-main">
          <div className="rabby-navbar-left">
            <div className="rabby-navbar-back" onClick={onBack}>
              {back ? back : <img src={IconBack} alt=""></img>}
            </div>
            {left}
          </div>
          <div className="rabby-navbar-title">{children}</div>
          <div className="rabby-navbar-right">{right}</div>
        </div>
        {desc ? <div className="rabby-navbar-desc">{desc}</div> : null}
      </div>
    </div>
  );
};

export default Navbar;
