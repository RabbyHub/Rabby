import React from 'react';
import { ReactComponent as RcIconPending } from '@/ui/assets/bridge/pending.svg';
export const PendingTx = ({
  number,
  onClick,
}: {
  number: number | string;
  onClick?: () => void;
}) => {
  return (
    <div
      className="w-20 h-20 inline-flex justify-center items-center cursor-pointer relative"
      onClick={onClick}
    >
      <RcIconPending
        viewBox="0 0 20 20"
        className="animate-spin w-20 h-20 absolute left-0 top-0"
      />
      <span className="text-13 text-r-blue-default">{number}</span>
    </div>
  );
};
