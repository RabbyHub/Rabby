import React, { useState, useCallback } from 'react';
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
type SwitchTabProps = Omit<PillsSwitchProps<OptionType[]>, 'options'>;

export function useSwitchNetTab() {
  const isShowTestnet = useRabbySelector((s) => s.preference.isShowTestnet);

  const [selectedTab, setSelectedTab] = useState<OptionType['key']>('mainnet');
  const onTabChange = useCallback(
    (key: OptionType['key']) => {
      if (!isShowTestnet) return;

      setSelectedTab(key);
    },
    [isShowTestnet]
  );

  return {
    isShowTestnet,
    selectedTab: !isShowTestnet ? 'mainnet' : selectedTab,
    onTabChange,
  };
}

export default function NetSwitchTabs(props: SwitchTabProps) {
  return (
    <PillsSwitch
      {...props}
      className="flex bg-[#e2e6ec] w-[228px] mx-[auto] my-[0] h-[36px] p-[2px] mb-[20px]"
      itemClassname={clsx('w-[112px]')}
      itemClassnameInActive={clsx('text-[#4B4d59]')}
      options={switchOptions}
    />
  );
}
