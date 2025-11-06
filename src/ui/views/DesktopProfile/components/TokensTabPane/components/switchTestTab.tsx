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
        'flex w-[260px] h-[32px] p-[2px] rounded-[6px]',
        ' bg-transparent border-[0.5px] border-solid border-rb-neutral-line'
      )}
      itemClassname={clsx('w-[128px] text-[12px]')}
      itemClassnameActive="bg-rb-blue-light-1 rounded-[6px]"
      itemClassnameInActive={clsx(
        'text-rb-neutral-foot hover:text-r-blue-default'
      )}
      options={switchOptions}
    />
  );
}
