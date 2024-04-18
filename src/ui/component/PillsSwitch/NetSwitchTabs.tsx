import React, { useState, useMemo, useCallback } from 'react';
import PillsSwitch, { PillsSwitchProps } from '@/ui/component/PillsSwitch';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const NetTypes = {
  mainnet: 'Mainnets',
  testnet: 'Testnets',
} as const;

export type NetSwitchTabsKey = keyof typeof NetTypes;
type OptionType = {
  key: NetSwitchTabsKey;
  label: string;
};
type SwitchTabProps = Omit<PillsSwitchProps<OptionType[]>, 'options'>;

export function useSwitchNetTab(options?: { hideTestnetTab?: boolean }) {
  const isShowTestnet = useRabbySelector((s) => s.preference.isShowTestnet);
  const { hideTestnetTab = false } = options || {};

  const [selectedTab, setSelectedTab] = useState<OptionType['key']>('mainnet');
  const alwaysMain = useMemo(() => !isShowTestnet || hideTestnetTab, [
    isShowTestnet,
    hideTestnetTab,
  ]);

  const onTabChange = useCallback(
    (key: OptionType['key']) => {
      setSelectedTab(alwaysMain ? 'mainnet' : key);
    },
    [alwaysMain]
  );

  return {
    isShowTestnet: isShowTestnet && !hideTestnetTab,
    selectedTab: alwaysMain ? 'mainnet' : selectedTab,
    onTabChange,
  };
}

function useSwitchOptions() {
  const { t } = useTranslation();

  return useMemo(() => {
    return [
      {
        key: 'mainnet',
        // Mainnets
        label: t('component.PillsSwitch.NetSwitchTabs.mainnet'),
      },
      {
        key: 'testnet',
        // Testnets
        label: t('component.PillsSwitch.NetSwitchTabs.testnet'),
      },
    ] as const;
  }, [t]);
}

export default function NetSwitchTabs(props: SwitchTabProps) {
  const switchOptions = useSwitchOptions();

  return (
    <PillsSwitch
      {...props}
      className="flex bg-r-neutral-line w-[260px] mx-[auto] my-[0] h-[32px] p-[2px] mb-[14px]"
      itemClassname={clsx('w-[128px] text-[12px]')}
      itemClassnameActive="bg-r-neutral-bg-1"
      itemClassnameInActive={clsx(
        'text-r-neutral-body hover:text-r-blue-default'
      )}
      options={switchOptions}
    />
  );
}

NetSwitchTabs.ApprovalsPage = function ApprovalsPage(props: SwitchTabProps) {
  const switchOptions = useSwitchOptions();

  return (
    <PillsSwitch
      {...props}
      className={clsx(
        'flex bg-r-neutral-line w-[228px] h-[32px] p-[2px]',
        props.className
      )}
      itemClassname={clsx('w-[112px]')}
      itemClassnameActive="bg-r-neutral-bg-1"
      itemClassnameInActive={clsx('text-r-neutral-body')}
      options={switchOptions}
    />
  );
};
