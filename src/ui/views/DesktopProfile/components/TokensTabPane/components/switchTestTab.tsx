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
        'flex h-[30px] p-[2px] rounded-[6px]',
        ' bg-rb-neutral-bg-0'
      )}
      itemClassname={clsx(
        'px-[12px] py-[6px] text-[12px] leading-[14px] w-auto'
      )}
      itemClassnameActive="bg-rb-neutral-foot text-rb-neutral-InvertHighlight rounded-[8px]"
      itemClassnameInActive={clsx('text-rb-neutral-foot')}
      options={switchOptions}
    />
  );
}
