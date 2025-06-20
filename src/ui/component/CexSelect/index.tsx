import { Drawer, DrawerProps } from 'antd';
import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { useRabbySelector } from '@/ui/store';

import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

export interface IExchange {
  id: string;
  name: string;
  logo: string;
}
interface AddressRiskAlertProps {
  visible: boolean;
  showClosableIcon?: boolean;
  title?: ReactNode;
  onCancel(): void;
  onSelect?(cex: IExchange): void;
  className?: string;
  height?: number | string;
  zIndex?: number;
  getContainer?: DrawerProps['getContainer'];
}

export const CexListSelectModal = ({
  title,
  visible,
  onSelect,
  onCancel,
  className,
  height = 540,
  zIndex,
  showClosableIcon = true,
  getContainer,
}: AddressRiskAlertProps) => {
  const handleCancel = () => {
    onCancel();
  };
  const { t } = useTranslation();
  const { exchanges } = useRabbySelector((s) => ({
    exchanges: s.exchange.exchanges,
  }));

  return (
    <Drawer
      title={title || t('page.sendPoly.selectExchangeSource')}
      width="400px"
      height={height}
      closable={showClosableIcon}
      placement={'bottom'}
      visible={visible}
      onClose={handleCancel}
      className={clsx('custom-popup is-support-darkmode is-new', className)}
      zIndex={zIndex}
      destroyOnClose
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
      }
      getContainer={getContainer}
      bodyStyle={{
        paddingBottom: 0,
      }}
    >
      {exchanges.map((cex) => (
        <div
          key={cex.id}
          className={`
                h-[58px] bg-r-neutral-card1 rounded-[8px] w-full pl-[16px] pr-[18px] mb-[8px]
                flex justify-between items-center cursor-pointer
                border-[1px] border-solid border-transparent
                hover:border-rabby-blue-default hover:bg-r-blue-light1
                `}
          onClick={() => {
            onSelect?.(cex);
          }}
        >
          <div className="flex items-center gap-[8px]">
            <img
              src={cex.logo}
              alt=""
              className="w-[24px] h-[24px] rounded-full overflow-hidden"
            />
            <div className="text-[15px] font-medium text-r-neutral-title1">
              {cex.name}
            </div>
          </div>
        </div>
      ))}
    </Drawer>
  );
};
