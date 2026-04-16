import React from 'react';

const lineColor = 'var(--r-neutral-line, #e5e9ef)';
const brandColor = 'var(--r-blue-default, #7084ff)';

type SelectionIndicatorProps = {
  isSelectedAll: boolean;
  isSelectedPartial: boolean;
};

export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  isSelectedAll,
  isSelectedPartial,
}) => {
  return (
    <div
      className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full"
      style={{
        border: `1.5px solid ${
          isSelectedAll || isSelectedPartial ? brandColor : lineColor
        }`,
        background:
          isSelectedAll || isSelectedPartial ? brandColor : 'transparent',
      }}
    >
      {isSelectedPartial ? (
        <div className="h-[2px] w-[10px] rounded-full bg-white" />
      ) : isSelectedAll ? (
        <div
          className="h-[6px] w-[10px] border-b-[2px] border-l-[2px] border-white"
          style={{
            transform: 'rotate(-45deg) translateY(-1px)',
          }}
        />
      ) : null}
    </div>
  );
};
