import { Switch } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CustomizedButton.module.css';

export interface Props {
  selected?: boolean;
  onOpen(): void;
  onClose(): void;
}

export const CustomizedSwitch: React.FC<Props> = ({
  selected,
  onOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    // <div
    //   className={clsx(
    //     'flex rounded',
    //     'py-[9px] px-12 bg-orange/20 justify-between mb-[10px]'
    //   )}
    // >
    //   <div className={clsx('text-orange text-13')}>
    //     {selected
    //       ? t('page.dashboard.tokenDetail.selectedCustom')
    //       : t('page.dashboard.tokenDetail.notSelectedCustom')}
    //   </div>
    <label className={clsx('flex items-center gap-x-6 cursor-pointer')}>
      <span className="text-r-neutral-foot text-12">
        {t('page.dashboard.tokenDetail.customized')}
      </span>
      <Switch
        className={styles.switch}
        size="small"
        checked={selected}
        onChange={(val) => {
          if (val) {
            onOpen();
          } else {
            onClose();
          }
        }}
      />
    </label>
    // </div>
  );
};
