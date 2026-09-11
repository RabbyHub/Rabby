import React, { useRef, useState } from 'react';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useExtensionUpdateStore } from '@/ui/state/extensionUpdate';
import Logo from '@/ui/assets/settings/update/logo.svg';
import Glow from '@/ui/assets/settings/update/glow.svg';
import Close from '@/ui/assets/settings/update/close.svg';
import Dot from '@/ui/assets/settings/update/dot.svg';

export const ExtensionUpdateCard = ({
  version,
  changelog,
  onUpdate,
  variant = 'card',
  onClose,
}: {
  version: string;
  changelog: string;
  onUpdate: () => Promise<void>;
  variant?: 'card' | 'dialog';
  onClose?: () => void;
}) => {
  const { t } = useTranslation();
  const level = useExtensionUpdateStore(
    (s) => s.versionInfo?.version.level ?? 0
  );
  const [dismissedVersion, setDismissedVersion] = useState<string>();
  const [updating, setUpdating] = useState(false);
  const pending = useRef(false);

  if (dismissedVersion === version) return null;

  const handleUpdate = async () => {
    if (pending.current) return;
    pending.current = true;
    setUpdating(true);
    try {
      await onUpdate();
    } catch (error) {
      message.error(
        (error as Error)?.message ||
          t('page.dashboard.settings.updateCard.error')
      );
    } finally {
      pending.current = false;
      setUpdating(false);
    }
  };

  return (
    <section
      className={`extension-update-card extension-update-card-${variant}`}
      aria-label={t('page.dashboard.settings.updateCard.title')}
    >
      <img className="extension-update-card-glow" src={Glow} alt="" />
      {variant === 'card' && (
        <img className="extension-update-card-logo" src={Logo} alt="" />
      )}
      <button
        type="button"
        className="extension-update-card-close"
        aria-label={t('page.dashboard.settings.updateCard.dismiss')}
        onClick={() => (onClose ? onClose() : setDismissedVersion(version))}
      >
        <img src={Close} width={16} height={16} alt="" />
      </button>
      <div className="extension-update-card-content">
        <div>
          <div className="extension-update-card-title">
            {t('page.dashboard.settings.updateCard.title')}
          </div>
          <div className="extension-update-card-version">
            <span>v{version}</span>
            {variant === 'card' && level > 1 && (
              <img src={Dot} width={5} height={5} alt="" />
            )}
          </div>
        </div>
        <div className="extension-update-card-notes">{changelog}</div>
        <Button
          type="primary"
          className="extension-update-card-button"
          loading={updating}
          onClick={handleUpdate}
        >
          {t('page.dashboard.settings.updateCard.update')}
        </Button>
      </div>
    </section>
  );
};
