import React from 'react';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';

const PortfolioHeader = ({
  data,
  name,
  showDescription,
  showHistory,
}: {
  data: AbstractPortfolio;
  name: string;
  showDescription?: boolean;
  showHistory?: boolean;
}) => {
  return (
    <div className="flex items-start mb-16">
      <div className="flex items-center flex-1 overflow-hidden">
        <div className="name mr-6 py-4 px-6 rounded-[10px] bg-r-blue-light-1 text-12 font-medium text-r-blue-default">
          {name}
        </div>
        {showDescription ? (
          <p className="description mb-0 text-12 font-medium text-r-neutral-title-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {data?._originPortfolio?.detail?.description || ''}
          </p>
        ) : null}
      </div>
      <div className="net-worth text-13 flex justify-end items-center text-r-neutral-title-1">
        <span>{data._netWorth}</span>
        {showHistory ? (
          <span>
            {data._netWorthChange !== '-'
              ? `${data._changePercentStr} (${data._netWorthChange})`
              : '-'}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default PortfolioHeader;
