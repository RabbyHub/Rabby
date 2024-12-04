import clsx from 'clsx';
import React from 'react';
import { ReactComponent as RcIconSwitchCC } from 'ui/assets/bridge/switch-arrow-cc.svg';

export const BridgeSwitchBtn = ({
  className,
  ...others
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-center cursor-pointer',
        'w-[32px] h-[32px] rounded-[900px]',
        'bg-r-neutral-bg-1 text-rabby-neutral-foot',
        'border-[0.5px] border-solid border-rabby-neutral-line',
        'hover:border-rabby-blue-default hover:bg-rabby-blue-light1 hover:text-rabby-blue-default',
        className
      )}
      {...others}
    >
      <RcIconSwitchCC className="w-16 h-16" viewBox="0 0 16 16" />
    </div>
  );
};
