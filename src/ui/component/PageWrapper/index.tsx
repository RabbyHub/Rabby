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
    <section className="w-full h-full flex flex-col bg-[#000000CC] h-8 fixed mb-8">
      <header className="bg-[#0F0F0F] flex gap-3 items-center p-1">
        <button>{closeIcon}</button>
        <div className="flex-1 text-12 font-semibold">Companyon</div>
        <button>{settingsIcon}</button>
      </header>
      <main className="flex flex-col w-full">{children}</main>
    </section>
  );
}

export default PageWrapper;
