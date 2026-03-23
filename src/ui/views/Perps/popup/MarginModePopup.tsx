import React from 'react';
import { Button } from 'antd';
import Popup from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface MarginModePopupProps {
  visible: boolean;
  currentMode: 'cross' | 'isolated';
  onCancel: () => void;
  onConfirm: (mode: 'cross' | 'isolated') => void;
}

export const MarginModePopup: React.FC<MarginModePopupProps> = ({
  visible,
  currentMode,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [pendingMode, setPendingMode] = React.useState<'cross' | 'isolated'>(
    currentMode
  );

  React.useEffect(() => {
    if (visible) {
      setPendingMode(currentMode);
    }
  }, [visible, currentMode]);

  return (
    <Popup
      placement="bottom"
      height={380}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={true}
      closable
      visible={visible}
      onCancel={onCancel}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-18 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
          {t('page.perps.marginMode')}
        </div>
        <div className="flex-1 px-20">
          <div
            className={clsx(
              'flex items-start gap-12 p-16 rounded-[8px] cursor-pointer mb-12 border border-solid',
              pendingMode === 'cross'
                ? 'border-rabby-blue-default bg-r-blue-light1'
                : 'border-transparent bg-r-neutral-card1'
            )}
            onClick={() => setPendingMode('cross')}
          >
            <div
              className={clsx(
                'w-16 h-16 rounded-full border-[2px] border-solid mt-2 flex-shrink-0 flex items-center justify-center',
                pendingMode === 'cross'
                  ? 'border-rabby-blue-default'
                  : 'border-rabby-neutral-foot'
              )}
            >
              {pendingMode === 'cross' && (
                <div className="w-8 h-8 rounded-full bg-r-blue-default" />
              )}
            </div>
            <div>
              <div className="text-14 font-medium text-r-neutral-title-1">
                {t('page.perps.crossMargin')}
              </div>
              <div className="text-12 text-r-neutral-foot mt-4">
                {t('page.perps.crossMarginDesc')}
              </div>
            </div>
          </div>
          <div
            className={clsx(
              'flex items-start gap-12 p-16 rounded-[8px] cursor-pointer border border-solid',
              pendingMode === 'isolated'
                ? 'border-rabby-blue-default bg-r-blue-light1'
                : 'border-transparent bg-r-neutral-card1'
            )}
            onClick={() => setPendingMode('isolated')}
          >
            <div
              className={clsx(
                'w-16 h-16 rounded-full border-[2px] border-solid mt-2 flex-shrink-0 flex items-center justify-center',
                pendingMode === 'isolated'
                  ? 'border-rabby-blue-default'
                  : 'border-rabby-neutral-foot'
              )}
            >
              {pendingMode === 'isolated' && (
                <div className="w-8 h-8 rounded-full bg-r-blue-default" />
              )}
            </div>
            <div>
              <div className="text-14 font-medium text-r-neutral-title-1">
                {t('page.perps.isolatedMargin')}
              </div>
              <div className="text-12 text-r-neutral-foot mt-4">
                {t('page.perps.isolatedMarginDesc')}
              </div>
            </div>
          </div>
        </div>
        <div className="px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line">
          <Button
            block
            size="large"
            type="primary"
            className="h-[48px] text-15 font-medium"
            onClick={() => onConfirm(pendingMode)}
          >
            {t('page.perps.confirm')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};
