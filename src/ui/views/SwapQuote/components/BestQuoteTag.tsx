import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const BestQuoteTag = ({
  className,
  invert = false,
  ...other
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  invert?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'h-[20px]  px-[6px] flex items-center   rounded-[2px] text-12 text-center ',
        invert ? 'bg-white text-blue-light' : 'bg-blue-light text-white',
        className
      )}
      {...other}
    >
      {t('BestQuote')}
    </div>
  );
};

export default BestQuoteTag;
