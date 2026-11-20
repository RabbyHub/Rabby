import React from 'react';
import clsx from 'clsx';

interface Props {
  percent: number;
}

export default function Progress({ percent }: Props) {
  return (
    <div className="text-center">
      <div
        className={clsx(
          'w-full overflow-hidden rounded-[3px] bg-[#dadada]',
          "before:block before:h-[6px] before:w-(--percent) before:bg-[#7084ff] before:content-['_']"
        )}
        style={{ '--percent': `${percent}%` }}
      ></div>
      <div className="mt-12 text-12 leading-[1] text-[#7084ff]">{percent}%</div>
    </div>
  );
}
