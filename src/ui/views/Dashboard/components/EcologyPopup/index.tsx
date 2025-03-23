import { Popup } from '@/ui/component';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/dashboard/settings/icon-right-arrow.svg';
import { EcoChains } from 'ui/views/Ecology/constants';

interface Props {
  visible?: boolean;
  onClose?(): void;
}
export const EcologyPopup = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <Popup
      visible={visible}
      height={'fit-content'}
      onClose={onClose}
      push={false}
      title={t('page.dashboard.echologyPopup.title')}
    >
      <div className="flex flex-col gap-[12px] pb-[8px]">
        {EcoChains.map((item) => {
          return (
            <div
              key={item.id}
              className={clsx(
                'flex items-center gap-[12px] p-[15px]',
                'rounded-[6px] bg-r-neutral-card-2 cursor-pointer',
                'border-[1px] border-transparent',
                'hover:border-rabby-blue-default hover:bg-r-blue-light1'
              )}
              onClick={() => {
                history.push(`/ecology/${item.id}`);
              }}
            >
              <img
                src={item.logo}
                alt={item.name + ' logo'}
                className="w-[24px] h-[24px] flex-shrink-0"
              />
              <div className="text-r-neutral-title-1 text-[15px] font-medium flex-1">
                {item?.name}
              </div>
              <ThemeIcon src={RcIconArrowRight} className="ml-auto" />
            </div>
          );
        })}
      </div>
    </Popup>
  );
};
