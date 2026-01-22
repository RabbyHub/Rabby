import React from 'react';
import PillsSwitch, { PillsSwitchProps } from '@/ui/component/PillsSwitch';
import {
  NetSwitchTabsKey,
  useSwitchOptions,
} from '@/ui/component/PillsSwitch/NetSwitchTabs';
import clsx from 'clsx';

type OptionType = {
  key: NetSwitchTabsKey;
  label: string;
};

type SwitchTabProps = Omit<PillsSwitchProps<OptionType[]>, 'options'>;
export default function MainnetTestnetSwitchTabs(props: SwitchTabProps) {
  const switchOptions = useSwitchOptions();

  return (
    <PillsSwitch
      {...props}
      className={clsx(
        'flex h-[30px] p-[2px] rounded-[8px]',
        ' bg-rb-neutral-bg-4'
      )}
      itemClassname={clsx(
        'px-[12px] py-[6px] text-[12px] leading-[14px] w-auto'
      )}
      itemClassnameActive="bg-rb-neutral-bg-1 text-r-neutral-body rounded-[6px]"
      itemClassnameInActive={clsx('text-rb-neutral-foot')}
      options={switchOptions}
    />
  );
}
