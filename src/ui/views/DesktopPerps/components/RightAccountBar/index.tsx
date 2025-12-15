import React from 'react';
import clsx from 'clsx';
import { DesktopSelectAccountList } from '@/ui/component/DesktopSelectAccountList';

export const RightAccountBar: React.FC = () => {
  return (
    <aside
      className={clsx(
        'min-w-[64px] flex-shrink-0 z-20 h-full overflow-auto border-l border-solid border-rb-neutral-line p-[16px]'
      )}
    >
      <DesktopSelectAccountList />
    </aside>
  );
};
