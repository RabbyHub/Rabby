import React from 'react';

import { ReactComponent as IconOffline } from '@/ui/assets/offline.svg';

type DappIframeErrorProps = {
  title: string;
  description: string;
  reloadLabel: string;
  onReload: () => void;
  imageSrc?: string;
};

export const DappIframeError: React.FC<DappIframeErrorProps> = ({
  title,
  description,
  reloadLabel,
  onReload,
  imageSrc,
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-rb-neutral-bg-1">
      <div className="flex flex-col items-center text-center gap-[8px] px-[24px]">
        <div className="w-[40px] h-[40px] rounded-full bg-rb-neutral-bg-1 text-rb-neutral-foot flex items-center justify-center">
          {imageSrc ? (
            <img src={imageSrc} alt="" className="w-[40px] h-[40px]" />
          ) : (
            <IconOffline className="w-[20px] h-[20px]" />
          )}
        </div>
        <div className="text-[16px] leading-[19px] font-semibold text-rb-neutral-title-1">
          {title}
        </div>
        <div className="text-[14px] leading-[17px] text-rb-neutral-foot">
          {description}
        </div>
        <button
          type="button"
          className="mt-[12px] h-[40px] px-[32px] rounded-[16px] bg-rb-brand-light-1 text-rb-brand-default text-[15px] font-semibold hover:bg-rb-brand-light-2"
          onClick={onReload}
        >
          {reloadLabel}
        </button>
      </div>
    </div>
  );
};
