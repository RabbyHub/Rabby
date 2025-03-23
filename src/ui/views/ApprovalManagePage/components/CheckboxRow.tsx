import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import React from 'react';
import { ReactComponent as RcIconCheckboxChecked } from '../icons/check-checked.svg';
import { ReactComponent as RcIconCheckboxIndeterminate } from '../icons/check-indeterminate.svg';
import { ReactComponent as RcIconCheckboxUnchecked } from '../icons/check-unchecked.svg';

export const CheckboxRow: React.FC<{
  onClick?: (evt: React.MouseEvent) => void;
  isIndeterminate?: boolean;
  isSelected?: boolean;
}> = ({ onClick, isIndeterminate, isSelected }) => {
  return (
    <div
      className="h-[100%] w-[100%] flex items-center justify-center cursor-pointer"
      onClick={onClick}
    >
      {isIndeterminate ? (
        <ThemeIcon
          className="J_indeterminate w-[20px] h-[20px]"
          src={RcIconCheckboxIndeterminate}
        />
      ) : isSelected ? (
        <ThemeIcon
          className="J_checked w-[20px] h-[20px]"
          src={RcIconCheckboxChecked}
        />
      ) : (
        <ThemeIcon
          className="J_unchecked w-[20px] h-[20px]"
          src={RcIconCheckboxUnchecked}
        />
      )}
    </div>
  );
};
