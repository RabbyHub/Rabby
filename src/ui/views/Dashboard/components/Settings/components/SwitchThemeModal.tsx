import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';

import IconCheck from 'ui/assets/check-2.svg';
import { DARK_MODE_TYPE, ThemeModes } from '@/constant';

export default function SwitchThemeModal({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  const themeMode = useRabbySelector((state) => state.preference.themeMode);
  const dispatch = useRabbyDispatch();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleSelect = async (value: DARK_MODE_TYPE) => {
    dispatch.preference.switchThemeMode(value);
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('switch-theme-modal', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('page.dashboard.settings.settings.themeMode')}
      </PageHeader>
      <div className="switch-theme-option-list">
        {ThemeModes.filter(
          (x) => x.code !== DARK_MODE_TYPE.system || !!process.env.DEBUG
        ).map((item) => {
          return (
            <div
              className="switch-theme-option-list-item"
              key={item.code}
              onClick={() => {
                handleSelect(item.code);
              }}
            >
              {item.name}
              {themeMode === item.code && (
                <img
                  src={IconCheck}
                  alt=""
                  className="switch-theme-option-list-item-icon"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
