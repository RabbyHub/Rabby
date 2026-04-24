import React from 'react';
import { useTranslation } from 'react-i18next';

import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';
import { ReactComponent as RcIconNoRabbyFee } from '@/ui/assets/gas-account/empty-no-rabby-fee.svg';
import { ReactComponent as RcIconSupportNetworks } from '@/ui/assets/global-cc.svg';
import { ReactComponent as RcIconSupportTransactions } from '@/ui/assets/gas-account/empty-support-transactions.svg';

const GasAccountCapabilityItem = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="flex h-[52px] items-center gap-6 rounded-[8px] bg-r-neutral-card2 px-12">
      <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center text-r-neutral-title-1">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-[16px] text-r-neutral-title-1">
          {title}
        </div>
        <div className="mt-[4px] text-[11px] leading-[13px] text-r-neutral-foot">
          {description}
        </div>
      </div>
    </div>
  );
};

export const GasAccountBenefitsCard: React.FC = () => {
  const { t } = useTranslation();

  const capabilityItems = [
    {
      icon: (
        <RcIconNoRabbyFee className="h-[28px] w-[28px] text-r-neutral-title-1" />
      ),
      title: t('page.gasAccount.benefitCard.item1'),
      description: t('page.gasAccount.benefitCard.desc1'),
    },
    {
      icon: (
        <RcIconSupportNetworks className="h-[28px] w-[28px] text-r-neutral-title-1" />
      ),
      title: t('page.gasAccount.benefitCard.item2'),
      description: t('page.gasAccount.benefitCard.desc2'),
    },
    {
      icon: (
        <RcIconSupportTransactions className="h-[28px] w-[28px] text-r-neutral-title-1" />
      ),
      title: t('page.gasAccount.benefitCard.item3'),
      description: t('page.gasAccount.benefitCard.desc3'),
    },
  ];

  return (
    <GasAccountWrapperBg className="flex h-[366px] w-full flex-col rounded-[8px] bg-r-neutral-card1 px-20 pt-24 pb-20">
      <GasAccountBlueLogo className="mx-auto h-[56px] w-[56px]" />
      <div className="mt-16 text-center text-[20px] font-semibold leading-[24px] text-r-neutral-title-1">
        {t('page.gasAccount.benefitCard.title')}
      </div>
      <div className="mt-4 text-center text-[13px] leading-[16px] text-r-neutral-foot">
        {t('page.gasAccount.benefitCard.subtitle')}
      </div>

      <div className="mt-24 flex flex-col gap-12">
        {capabilityItems.map((item) => (
          <GasAccountCapabilityItem key={item.title} {...item} />
        ))}
      </div>
    </GasAccountWrapperBg>
  );
};
