import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Glow from '@/ui/assets/settings/update/glow.svg';
import Logo from '@/ui/assets/settings/update/logo.svg';
import Close from '@/ui/assets/settings/update/close.svg';
import Arrow from '@/ui/assets/settings/update/arrow.svg';

export const ExtensionUpdateBanner = ({
  visible,
  onCheck,
}: {
  visible: boolean;
  onCheck: () => void;
}) => {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setDismissed(true), 300);
    return () => clearTimeout(timer);
  }, [closing]);

  if (!visible || dismissed) return null;

  return (
    <section
      className={clsx('extension-update-banner', { 'is-closing': closing })}
      aria-label={t('page.dashboard.settings.updateCard.title')}
      aria-hidden={closing || undefined}
    >
      <img className="extension-update-banner-glow" src={Glow} alt="" />
      <img className="extension-update-banner-logo" src={Logo} alt="" />
      <div className="extension-update-banner-title">
        <img src={Arrow} width={16} height={16} alt="" />
        <span>{t('page.dashboard.settings.updateCard.title')}</span>
      </div>
      <button
        type="button"
        className="extension-update-banner-close"
        aria-label={t('page.dashboard.settings.updateCard.dismiss')}
        disabled={closing}
        onClick={() => setClosing(true)}
      >
        <img src={Close} width={16} height={16} alt="" />
      </button>
      <Button
        type="primary"
        className="extension-update-banner-check"
        disabled={closing}
        onClick={() => {
          setDismissed(true);
          onCheck();
        }}
      >
        {t('page.dashboard.settings.updateCard.check')}
      </Button>
    </section>
  );
};
