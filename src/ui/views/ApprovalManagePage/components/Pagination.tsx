import React from 'react';
import clsx from 'clsx';
import { SvgIconArrowRight } from 'ui/assets';

interface PaginationProps {
  current: number;
  onChange: (page: number) => void;
}

const Pagination = ({ current, onChange }: PaginationProps) => {
  const handlePageChange = (page: number) => {
    if (page < 1) return;
    onChange(page);
  };

  return (
    <div className="pagination">
      <SvgIconArrowRight
        className={clsx('icon icon-arrow-left', { disabled: current === 1 })}
        onClick={() => handlePageChange(current - 1)}
      />
      <span>{current}</span>
      <SvgIconArrowRight
        className="icon icon-arrow-right"
        onClick={() => handlePageChange(current + 1)}
      />
    </div>
  );
};

export default Pagination;
