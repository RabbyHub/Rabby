import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Popup from '@/ui/component/Popup';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import perpsWidgetGuideGif from '@/ui/assets/perps/perps-widget-guide.gif';
import perpsWidgetGuideFallback from '@/ui/assets/perps/perps-widget-guide-fallback.jpg';

interface PerpsWidgetGuidePopupProps {
  visible: boolean;
  openLoading?: boolean;
  onOpen: () => void;
  onCancel: () => void;
}

export const PerpsWidgetGuidePopup: React.FC<PerpsWidgetGuidePopupProps> = ({
  visible,
  openLoading,
  onOpen,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setImageLoadFailed(false);
    }
  }, [visible]);

  const bullets = [
    t('page.perps.perpsWidgetGuide.bulletViewPositions'),
    t('page.perps.perpsWidgetGuide.bulletPrices'),
    t('page.perps.perpsWidgetGuide.bulletToggle'),
  ];
  const imageSrc = imageLoadFailed
    ? perpsWidgetGuideFallback
    : perpsWidgetGuideGif;

  return (
    <Popup
      placement="bottom"
      height={485}
      visible={visible}
      onCancel={onCancel}
      maskClosable
      closable={false}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-t-[16px] bg-r-neutral-bg2">
        <div className="relative flex h-[56px] shrink-0 items-center justify-center px-56">
          <div className="text-center text-[20px] font-medium leading-[24px] text-r-neutral-title-1">
            {t('page.perps.perpsWidgetGuide.title')}
          </div>
          <button
            type="button"
            className="absolute right-20 top-[18px] flex h-[20px] w-[20px] items-center justify-center border-none bg-transparent p-0 text-r-neutral-foot hover:text-r-blue-default"
            onClick={onCancel}
            aria-label={t('global.closeButton')}
          >
            <RcIconCloseCC className="h-[20px] w-[20px]" />
          </button>
        </div>

        <div className="mx-20 h-[270px] shrink-0 overflow-hidden rounded-[12px] bg-r-neutral-foot">
          <img
            src={imageSrc}
            alt=""
            className="block h-full w-full object-cover"
            onError={() => {
              if (!imageLoadFailed) {
                setImageLoadFailed(true);
              }
            }}
          />
        </div>

        <div className="flex h-[79px] shrink-0 flex-col gap-6 px-20 pt-16">
          {bullets.map((text) => (
            <div key={text} className="flex min-h-[17px] items-center gap-8">
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#C5C5CF]" />
              <span className="text-[14px] leading-[17px] text-r-neutral-body">
                {text}
              </span>
            </div>
          ))}
        </div>

        <div className="flex h-[80px] shrink-0 gap-10 px-20 py-16">
          <button
            type="button"
            className={clsx(
              'h-[48px] w-[108px] shrink-0 rounded-[8px]',
              'border border-solid border-[#4C65FF] bg-transparent p-0',
              'text-[15px] font-medium leading-[18px] text-[#4C65FF]'
            )}
            onClick={onCancel}
          >
            {t('page.perps.perpsWidgetGuide.later')}
          </button>
          <button
            type="button"
            className={clsx(
              'h-[48px] flex-1 rounded-[8px] bg-[#4C65FF]',
              'border-none p-0 text-[15px] font-medium leading-[18px] text-white',
              openLoading && 'cursor-not-allowed opacity-70'
            )}
            disabled={openLoading}
            onClick={onOpen}
          >
            {t('page.perps.perpsWidgetGuide.open')}
          </button>
        </div>
      </div>
    </Popup>
  );
};

export default PerpsWidgetGuidePopup;
