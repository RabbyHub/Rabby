import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import React from 'react';
import { CheckboxCC, CheckboxIndeterminateCC } from 'ui/assets/checkbox';

export const Checkbox: React.FC<{
  checked: boolean;
  indeterminate?: boolean;
  width?: string;
  height?: string;
  onChange?: (evt: React.MouseEvent) => void;
}> = ({
  checked,
  indeterminate,
  width = '20px',
  height = '20px',
  onChange,
}) => {
  return (
    <div
      className="flex items-center justify-center cursor-pointer"
      onClick={(evt) => {
        evt.stopPropagation();
        onChange?.(evt);
      }}
      style={{ width, height }}
    >
      <ThemeIcon
        className="w-full h-full"
        src={indeterminate ? CheckboxIndeterminateCC : CheckboxCC}
        style={{
          opacity: checked || indeterminate ? 1 : 0.4,
        }}
      />
    </div>
  );
};
