import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const BestQuoteTag = ({
  className,
  ...other
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'h-[20px]  px-[6px] flex items-center  bg-blue-light rounded-[2px] text-12 text-center text-white',
        className
      )}
      {...other}
    >
      {t('BestQuote')}
    </div>
  );
};

export default BestQuoteTag;
