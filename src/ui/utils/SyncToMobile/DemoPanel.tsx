import React, { useEffect, useState } from 'react';
import { ReactComponent as PhoneSVG } from '@/ui/assets/sync-to-mobile/phone.svg';
import { useWallet } from '@/ui/utils/WalletContext';

const NEW_VIDEO_SRC = 'https://static-assets.debank.com/files/9d8010a4-c458-4626-bccd-f0ebda3e4d2f.mp4';
const FALLBACK_VIDEO_SRC = 'https://static-assets.debank.com/files/31fdc403-add6-4c45-8eca-24177b327f3e.mp4';

export const DemoPanel: React.FC = () => {
  const wallet = useWallet();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await wallet.fetchRemoteConfig();
        if (config?.switches?.rabbySyncTour20260403) {
          setVideoSrc(NEW_VIDEO_SRC);
        } else {
          setVideoSrc(FALLBACK_VIDEO_SRC);
        }
      } catch (e) {
        setVideoSrc(FALLBACK_VIDEO_SRC);
      }
    };
    fetchConfig();
  }, [wallet]);

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
        {videoSrc && (
          <video
            autoPlay
            loop
            muted
            playsInline
            src={videoSrc}
          />
        )}
      </div>
    </div>
  );
};
