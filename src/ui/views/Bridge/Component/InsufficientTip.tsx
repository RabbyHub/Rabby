import ImgWarning from 'ui/assets/swap/warn.svg';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const InSufficientTip = ({
  inSufficient,
}: {
  inSufficient: boolean;
}) => {
  const { t } = useTranslation();
  if (!inSufficient) return null;
  return (
    <div className="mb-20 p-10 flex gap-4 rounded-[4px] bg-[#FFDB5C] bg-opacity-10">
      <img src={ImgWarning} className="w-16 h-16 mt-2" />
      <span className="text-[#FFDB5C] text-13">
        {t('page.swap.InSufficientTip')}
      </span>
    </div>
  );
};
