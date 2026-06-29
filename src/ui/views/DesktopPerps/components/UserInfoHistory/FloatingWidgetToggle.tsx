import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tooltip, message } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { useWallet } from 'ui/utils';
import { ga4 } from '@/utils/ga4';
import { perpsToast } from '../PerpsToast';
import './FloatingWidgetToggle.less';

const CheckboxIcon = ({ checked }: { checked: boolean }) =>
  checked ? (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width="15"
        height="15"
        rx="3.5"
        stroke="currentColor"
      />
      <path
        d="M4.66797 7.99913L7.11241 10.4436L12.0013 5.55469"
        stroke="var(--rb-neutral-body)"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width="15"
        height="15"
        rx="3.5"
        stroke="currentColor"
      />
    </svg>
  );

export const FloatingWidgetToggle = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    wallet
      .getPerpsWidgetEnabled()
      .then((value) => {
        if (!cancelled) {
          setEnabled(!!value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setInitialized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const handleToggle = useCallback(async () => {
    if (busyRef.current) {
      return;
    }

    const nextEnabled = !enabled;
    busyRef.current = true;
    setBusy(true);
    try {
      await wallet.setPerpsWidgetEnabled(nextEnabled);
      setEnabled(nextEnabled);
      ga4.fireEvent(`PerpsFloating_${nextEnabled ? 'On' : 'Off'}`, {
        event_category: 'Settings Snapshot',
      });

      if (nextEnabled) {
        perpsToast.success({
          title: t('page.perpsPro.userInfo.floatingWidget.enabledToastTitle'),
          description: t(
            'page.perpsPro.userInfo.floatingWidget.enabledToastDescription'
          ),
        });
      } else {
        perpsToast.success({
          title: t('page.perpsPro.userInfo.floatingWidget.disabledToastTitle'),
        });
      }
    } catch (error) {
      message.error(
        (error as Error)?.message ||
          t('page.perpsPro.userInfo.floatingWidget.updateFailed')
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [enabled, t, wallet]);

  return (
    <div className="desktop-perps-floating-widget-toggle">
      <button
        type="button"
        role="checkbox"
        aria-checked={enabled}
        disabled={busy || !initialized}
        className={clsx(
          'desktop-perps-floating-widget-toggle-button',
          busy && 'is-busy'
        )}
        onClick={handleToggle}
      >
        <CheckboxIcon checked={enabled} />
        <span className="desktop-perps-floating-widget-toggle-label">
          {t('page.perpsPro.userInfo.floatingWidget.label')}
        </span>
      </button>
      <Tooltip
        placement="top"
        trigger="hover"
        overlayClassName="desktop-perps-floating-widget-tooltip rectangle"
        title={t('page.perpsPro.userInfo.floatingWidget.tooltip')}
      >
        <span className="desktop-perps-floating-widget-info">
          <RcIconInfo />
        </span>
      </Tooltip>
    </div>
  );
};
