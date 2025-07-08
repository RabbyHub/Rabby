import React from 'react';
import { ReactComponent as PhoneSVG } from '@/ui/assets/sync-to-mobile/phone.svg';

export const DemoPanel: React.FC = () => {
  return (
    <div className="relative">
      <PhoneSVG className="absolute left-[-75px] top-[-42px]" />
      <div
        className="h-[608px] w-[284px] rounded-[40px] mt-[2px] overflow-hidden bg-r-neutral-bg1"
        style={{
          boxShadow:
            '0px -7.05px 30.911px 0px rgba(0, 0, 0, 0.10), 0px -20.607px 21.692px 0px rgba(255, 255, 255, 0.10), 0px 44.468px 67.787px 0px rgba(0, 0, 0, 0.15), 0px 20.065px 20.065px 0px rgba(0, 0, 0, 0.10)',
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          src="https://static-assets.debank.com/files/31fdc403-add6-4c45-8eca-24177b327f3e.mp4"
        />
      </div>
    </div>
  );
};
