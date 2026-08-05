import React from 'react';
import { Switch } from 'antd';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { ReactComponent as RcIconArrowRightCC } from 'ui/assets/arrow-right-cc.svg';
import { resolveAccountTypeOption } from './AccountTypePanel';

const SettingsRow: React.FC<{
  label: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ label, onClick, children }) => (
  <div
    onClick={onClick}
    className={clsx(
      'group flex items-center justify-between gap-[12px]',
      onClick && 'cursor-pointer'
    )}
  >
    <span className="text-[13px] leading-[16px] text-rb-neutral-title-1">
      {label}
    </span>
    <div className="flex shrink-0 items-center gap-[4px]">{children}</div>
  </div>
);

/**
 * Wraps a control that handles its own click so the row-level handler doesn't
 * also fire — otherwise clicking a switch toggles it twice and nothing moves.
 */
const StopRowClick: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span className="flex items-center" onClick={(e) => e.stopPropagation()}>
    {children}
  </span>
);

export const SettingsHome: React.FC<{
  /** Declared inline rather than importing `PerpsSettingsPage` from `./index`,
   *  which would make this a module cycle for a type that is erased anyway. */
  onNavigate: (page: 'orderConfirmations' | 'accountType') => void;
}> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  const userAbstraction = useRabbySelector((s) => s.perps.userAbstraction);
  const soundEnabled = useRabbySelector((s) => s.perps.soundEnabled);
  const showPopularTradings = useRabbySelector(
    (s) => s.perps.showPopularTradings
  );

  // Bare name here — the "(Recommend)" suffix belongs to the option card on
  // the sub-page, not to this summary value.
  const accountTypeLabelKey = resolveAccountTypeOption(userAbstraction)
    .shortLabelKey;

  const handleSoundChange = useMemoizedFn((checked: boolean) => {
    dispatch.perps.updateEnabledSound(checked);
  });

  const handlePopularTradingsChange = useMemoizedFn((checked: boolean) => {
    dispatch.perps.updateShowPopularTradings(checked);
  });

  return (
    <div className="flex flex-col gap-[24px] px-[20px] py-[12px]">
      <SettingsRow
        label={t('page.perpsPro.settings.accountType')}
        onClick={() => onNavigate('accountType')}
      >
        <span className="text-[12px] leading-[16px] text-rb-neutral-secondary">
          {t(`page.perpsPro.settings.accountTypeOption.${accountTypeLabelKey}`)}
        </span>
        <RcIconArrowRightCC className="w-[16px] h-[16px] text-rb-neutral-foot group-hover:text-rb-brand-default" />
      </SettingsRow>

      <div className="h-0 w-full border-t border-solid border-rb-neutral-line" />

      <SettingsRow
        label={t('page.perpsPro.settings.orderConfirmations')}
        onClick={() => onNavigate('orderConfirmations')}
      >
        <RcIconArrowRightCC className="w-[16px] h-[16px] text-rb-neutral-foot group-hover:text-rb-brand-default" />
      </SettingsRow>

      {/* The whole row toggles: a 28x14 switch is a small target, and the rows
          above it are already row-wide clickable. */}
      <SettingsRow
        label={t('page.perpsPro.settings.soundReminder')}
        onClick={() => handleSoundChange(!soundEnabled)}
      >
        <StopRowClick>
          <Switch
            size="small"
            checked={soundEnabled}
            onChange={handleSoundChange}
            className="desktop-perps-settings-switch"
          />
        </StopRowClick>
      </SettingsRow>

      <SettingsRow
        label={t('page.perpsPro.settings.popularTradings')}
        onClick={() => handlePopularTradingsChange(!showPopularTradings)}
      >
        <StopRowClick>
          <Switch
            size="small"
            checked={showPopularTradings}
            onChange={handlePopularTradingsChange}
            className="desktop-perps-settings-switch"
          />
        </StopRowClick>
      </SettingsRow>
    </div>
  );
};

export default SettingsHome;
