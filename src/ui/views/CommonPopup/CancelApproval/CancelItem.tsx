import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';
import IconArrowRight from '@/ui/assets/dashboard/settings/icon-right-arrow.svg';

export interface Props {
  onClick(): void;
}

const Styled = styled.div`
  border-color: var(--r-neutral-card-2) !important;
  &:hover {
    border-color: var(--r-blue-default) !important;
  }
`;

export const CancelItem: React.FC<Props> = ({ children, onClick }) => {
  return (
    <Styled
      onClick={onClick}
      className={clsx(
        'px-16 py-[15px]',
        'flex items-start justify-between',
        'text-r-neutral-title-1 text-14 font-medium',
        'border rounded-md',
        'bg-r-neutral-card-2  cursor-pointer',
        'hover:bg-r-blue-light-1'
      )}
    >
      <span>{children}</span>
      <img src={IconArrowRight} className="w-20" />
    </Styled>
  );
};
