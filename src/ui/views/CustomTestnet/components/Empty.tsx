import React from 'react';
import { useTranslation } from 'react-i18next';

export const Emtpy = ({ description }: { description: string }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-transparent min-h-[auto] flex-1 pt-[117px]">
      <img
        className="no-data-image w-[100px] my-0 mx-auto"
        src="/images/nodata-tx.png"
        alt="no address"
      />
      <p className="text-r-neutral-body text-14 text-center font-medium">
        {description}
      </p>
    </div>
  );
};
