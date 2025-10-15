import { APP_STORE_LINK, GOOGLE_PLAY_LINK } from '@/constant/download';
import { Popup } from '@/ui/component';
import QRCode from 'qrcode.react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconAppStore from 'ui/assets/dashboard/app-store.svg';
import IconGooglePlay from 'ui/assets/dashboard/google-play.svg';
import { ReactComponent as RcIconRabbyPoints } from 'ui/assets/dashboard/rabby-points-claim.svg';

const downloadLinks = [
  {
    icon: IconAppStore,
    url: APP_STORE_LINK,
  },
  {
    icon: IconGooglePlay,
    url: GOOGLE_PLAY_LINK,
  },
];

interface Props {
  visible?: boolean;
  onClose?(): void;
}
export const RabbyPointsPopup = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();

  return (
    <Popup
      visible={visible}
      height={'fit-content'}
      onClose={onClose}
      push={false}
      closable={true}
      title={t('page.dashboard.rabbyPointsPopup.title')}
      bodyStyle={{ padding: 0 }}
    >
      <div className="flex flex-col items-center justify-center pt-[16px] pb-[22px]">
        <RcIconRabbyPoints />
        <div className="text-r-neutral-title1 text-center text-[20px] leading-[24px] font-medium mt-[16px] mb-[8px]">
          {t('page.dashboard.rabbyPointsPopup.desc')}
        </div>
        <div className="text-r-neutral-foot text-center text-[12px] leading-[14px]">
          {t('page.dashboard.rabbyPointsPopup.downloadIntro')}
        </div>
      </div>
      <footer className="py-[16px] px-[52px] border-t-[1px] border-dashed border-rabby-neutral-line flex items-center justify-center gap-[36px]">
        {downloadLinks.map((item) => {
          return (
            <div className="relative">
              <QRCode
                value={item.url}
                size={126}
                level="H"
                includeMargin={false}
                renderAs="svg"
              />
              <img
                src={item.icon}
                alt=""
                className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]"
              />
            </div>
          );
        })}
      </footer>
    </Popup>
  );
};
