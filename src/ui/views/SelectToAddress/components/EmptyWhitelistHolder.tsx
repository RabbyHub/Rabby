import React from 'react';
import { ReactComponent as RcEmptyWhitelistLogo } from '@/ui/assets/address/EmptyWhiteListLogo.svg';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface IProps {
  onAddWhitelist?: () => void;
}

export const EmptyWhitelistHolder = ({
  onAddWhitelist,
  style,
  className,
}: IProps & {
  className?: string;
  style?: React.CSSProperties;
}) => {
  const { t } = useTranslation();
  const handleAddWhitelist = () => {
    onAddWhitelist?.();
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center px-[20px] pt-[39px] pb-[24px] bg-r-neutral-card1 rounded-[12px]',
        className
      )}
      style={style}
    >
      <div className="text-r-blue-light1">
        <RcEmptyWhitelistLogo width={60} height={60} />
      </div>
      <div>
        <div className="text-r-neutral-title1 text-[20px] font-medium mt-[16px] text-center">
          {t('page.selectToAddress.emptyWhitelist.title')}
        </div>
        <div className="text-[15px] text-r-neutral-foot mt-[8px] text-center font-normal">
          {t('page.selectToAddress.emptyWhitelist.desc')}
        </div>
      </div>
      <div
        className={`mt-[47px] font-medium text-[16px] text-r-blue-default text-center w-full
          border border-r-blue-default rounded-[12px]
          h-[48px] leading-[48px] cursor-pointer
          hover:bg-r-blue-light1
        `}
        onClick={handleAddWhitelist}
      >
        {t('page.selectToAddress.emptyWhitelist.addNow')}
      </div>
    </div>
  );
};
