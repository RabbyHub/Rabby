import React, { ReactNode } from 'react';
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
    <div className="min-h-[48px] bg-r-blue-default">
      <div className="w-full py-16 px-20 min-[400px]:w-[400px] min-[400px]:mx-auto">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="cursor-pointer" onClick={onBack}>
              {back ? back : <img src={IconBack} alt=""></img>}
            </div>
            {left}
          </div>
          <div className="flex-auto px-12 font-medium text-20 leading-[23px] text-center text-white overflow-hidden text-ellipsis whitespace-nowrap">
            {children}
          </div>
          <div className="flex-1 text-right">{right}</div>
        </div>
        {desc ? (
          <div className="mt-4 px-20 font-normal text-14 leading-[16px] text-center text-white opacity-80">
            {desc}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Navbar;
