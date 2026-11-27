import { Popup } from '@/ui/component';
import { DrawerProps } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/dashboard/settings/icon-right-arrow.svg';
import { useDocumentClass } from '@/ui/hooks/useDocumentClass';
import styles from './ReplacePopup.module.css';

interface ReplacePopupProps {
  visible?: boolean;
  onClose?: () => void;
  onSelect?: (value: string) => void;
  getContainer?: DrawerProps['getContainer'];
}
export const ReplacePopup = ({
  visible,
  onClose,
  onSelect,
  getContainer,
}: ReplacePopupProps) => {
  const { t } = useTranslation();
  useDocumentClass(styles.globalActive);
  const options = [
    {
      label: t('page.safeQueue.ReplacePopup.options.send'),
      value: 'send',
    },
    {
      label: t('page.safeQueue.ReplacePopup.options.reject'),
      value: 'reject',
    },
  ];
  return (
    <Popup
      title={t('page.safeQueue.ReplacePopup.title')}
      visible={visible}
      onCancel={onClose}
      closable
      className="safe-replace-popup"
      height={250}
      getContainer={getContainer}
    >
      <div>
        <div className="desc text-r-neutral-body text-[14px] font-normal mb-20 leading-[17px]">
          {t('page.safeQueue.ReplacePopup.desc')}
        </div>
        <div className="option-list">
          {options.map((item) => {
            return (
              <div
                key={item.value}
                className="option-list-item flex items-center rounded-[6px] bg-r-neutral-card-2 border border-transparent p-[15px] cursor-pointer [&:not(:last-child)]:mb-12 hover:border-r-blue-default hover:bg-r-blue-light-1"
                onClick={() => {
                  onSelect?.(item.value);
                }}
              >
                <div className="option-list-item-content text-r-neutral-title-1 text-15 font-medium">
                  {item.label}
                </div>
                <div className="option-list-item-right ml-auto">
                  <img src={IconArrowRight} alt="" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Popup>
  );
};
