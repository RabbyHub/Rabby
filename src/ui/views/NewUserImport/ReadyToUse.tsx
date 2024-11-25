import React from 'react';
import { Card } from '@/ui/component/NewUserImport';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as RcIconRabbyLogo } from '@/ui/assets/rabby-white.svg';
import { ReactComponent as RcIconExtension } from '@/ui/assets/new-user-import/extension.svg';
import { ReactComponent as RcIconPin } from '@/ui/assets/new-user-import/pin.svg';
import { ReactComponent as RcIconTriangle } from '@/ui/assets/new-user-import/triangle.svg';

export const ReadyToUse = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <Card onBack={history.goBack}>
      <div className="flex flex-col items-center">
        <div className="mt-[82px] w-80 h-80 flex items-center justify-center bg-r-blue-default rounded-full">
          <RcIconRabbyLogo viewBox="0 0 14 14" className="w-[52px] h-[46px]" />
        </div>
        <div className="mt-32 mb-12 text-24 font-medium text-r-neutral-title1">
          {t('page.newUserImport.readyToUse.title')}
        </div>
        <div className="max-w-[320px] text-14 font-normal text-r-neutral-foot text-center">
          {t('page.newUserImport.readyToUse.desc')}
        </div>
      </div>

      <div
        className={clsx(
          'fixed top-[23px] right-[65px]',
          'w-[205px] h-[60px]',
          'py-12 px-16',
          'bg-r-neutral-card-1 rounded-[12px]'
        )}
      >
        <RcIconTriangle className="absolute top-[-12px] right-[22px]" />
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 flex items-center justify-center bg-r-blue-default rounded-full">
            <RcIconRabbyLogo
              viewBox="0 0 14 14"
              className="w-[20px] h-[20px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-15 font-medium text-r-neutral-title1">
              {t('page.newUserImport.readyToUse.pin')}
            </span>
            <div className="flex items-center justify-center gap-4">
              <Trans t={t} i18nKey="page.newUserImport.readyToUse.extensionTip">
                Click
                <RcIconExtension />
                adn then
                <RcIconPin />
              </Trans>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
