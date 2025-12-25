import React from 'react';

interface ReduceOnlyToggleProps {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

export const ReduceOnlyToggle: React.FC<ReduceOnlyToggleProps> = ({
  checked,
  disabled,
  onChange,
}) => {
  return (
    <label
      className={`flex items-center gap-[8px] ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-[16px] h-[16px] rounded-[4px] accent-blue-600"
      />
      <span className="text-r-neutral-title-1 text-[13px]">Reduce Only</span>
    </label>
  );
};
