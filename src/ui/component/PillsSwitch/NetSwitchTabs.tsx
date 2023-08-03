import React, { useState, useMemo, useCallback } from 'react';
import PillsSwitch, { PillsSwitchProps } from '@/ui/component/PillsSwitch';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';

const NetTypes = {
  mainnet: 'Mainnets',
  testnet: 'Testnets',
} as const;

export const switchOptions = [
  {
    key: 'mainnet',
    label: NetTypes.mainnet,
  },
  {
    key: 'testnet',
    label: NetTypes.testnet,
  },
] as const;

type OptionType = typeof switchOptions[number];
export type NetSwitchTabsKey = OptionType['key'];
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

export default function NetSwitchTabs(props: SwitchTabProps) {
  return (
    <PillsSwitch
      {...props}
      className="flex bg-[#e2e6ec] w-[228px] mx-[auto] my-[0] h-[36px] p-[2px] mb-[14px]"
      itemClassname={clsx('w-[112px]')}
      itemClassnameInActive={clsx('text-[#4b4d59]')}
      options={switchOptions}
    />
  );
}

NetSwitchTabs.ApprovalsPage = function ApprovalsPage(props: SwitchTabProps) {
  return (
    <PillsSwitch
      {...props}
      className={clsx(
        'flex bg-[#e2e6ec] w-[228px] h-[32px] p-[2px]',
        props.className
      )}
      itemClassname={clsx('w-[112px]')}
      itemClassnameInActive={clsx('text-[#4b4d59]')}
      options={switchOptions}
    />
  );
};
