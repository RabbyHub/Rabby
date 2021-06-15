import React from 'react';
import cx from 'clsx';
import { useSelectOption } from 'ui/utils';
import { SvgIconCross } from 'ui/assets';

interface TiledSelectProps {
  defaultValue?: string[];
  value?: string[];
  options: string[];
  onChange?(arg: string[]): void;
  className?: string;
}

const TiledSelect = ({
  defaultValue,
  value,
  options,
  onChange,
  className,
}: TiledSelectProps) => {
  const [_value, handleRemove, handleChoose] = useSelectOption<string>({
    onChange,
    value,
    defaultValue,
    options,
  });

  return (
    <div className={className}>
      <div className="rounded-lg bg-white text-center font-medium mb-16 p-12 pr-0 h-[165px]">
        {_value &&
          _value.map((v, i) => (
            <div
              style={{ lineHeight: '27px' }}
              className="rounded-lg bg-gray-bg text-13 text-gray-title mr-8 h-[28px] px-10 mb-8 float-left inline-block cursor-pointer"
              key={v}
              onClick={() => handleRemove(i)}
            >
              <span className="mr-8">{v}</span>
              <SvgIconCross className="align-baseline inline-block w-6 fill-current text-gray-comment" />
            </div>
          ))}
      </div>
      <div className="flex justify-between flex-wrap -mr-8 clear-left">
        {options.map((o, i) => (
          <div
            style={{ lineHeight: '32px' }}
            className={cx(
              'h-[32px] w-[84px] rounded-lg cursor-pointer text-center mb-8 font-medium mr-8 transition-colors border',
              _value.includes(o)
                ? 'bg-gray-bg text-gray-comment border-gray-divider'
                : 'bg-white text-gray-title border-white'
            )}
            key={o}
            onClick={() => handleChoose(i)}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TiledSelect;
