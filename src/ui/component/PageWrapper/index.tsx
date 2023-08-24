import React, { PropsWithChildren } from 'react';

import { SvgIconCClose, SvgIconCSetings } from 'ui/assets';

const closeIcon = (
  <SvgIconCClose className="w-[24px] h-[24px] fill-current text-gray-content" />
);

const settingsIcon = (
  <SvgIconCSetings className="w-[24px] h-[24px] fill-current text-gray-content" />
);

function PageWrapper(props: PropsWithChildren<any>) {
  const { children } = props;
  return (
    <section className="w-full flex flex-col bg-[#000000CC] border border-[red] overflow-hidden">
      <header className="bg-[#0F0F0F] h-[32px] w-full flex gap-3 items-center p-[4px]">
        <button>{closeIcon}</button>
        <div className="flex-1 text-12 font-semibold">Companyon</div>
        <button>{settingsIcon}</button>
      </header>
      <main className="flex flex-col w-full overflow-y-scroll overflow-x-hidden h-[calc(100vh-32px)]">
        {children}
      </main>
    </section>
  );
}

export default PageWrapper;
