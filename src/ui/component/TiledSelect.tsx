import React from 'react';
import cx from 'clsx';
import { useSelectOption } from 'ui/utils';
import { IconCross } from 'ui/assets';

interface TiledSelectProps {
  defaultValue?: string[];
  value?: string[];
  options: string[];
  onChange?(string): void;
  className?: string;
}

const TiledSelect = ({
  defaultValue,
  value,
  options,
  onChange,
  className,
}: TiledSelectProps) => {
  const [_value, handleRemove, handleChoose] = useSelectOption(
    onChange,
    value,
    defaultValue
  );

  return (
    <div className={className}>
      <div className="rounded-lg bg-white text-center font-medium mb-16 p-12 overflow-y-auto">
        {_value &&
          _value.map((v, i) => (
            <div
              style={{ lineHeight: '27px' }}
              className="rounded-lg bg-gray-bg text-13 text-gray-title mr-8 h-[27px] px-10 mb-8 float-left inline-block"
              key={v}
            >
              <span className="mr-8">{v}</span>
              <img
                className="align-baseline inline-block"
                src={IconCross}
                onClick={() => handleRemove(i)}
              />
            </div>
          ))}
      </div>
      <div className="flex justify-between flex-wrap -mr-8 clear-left">
        {options.map((o) => (
          <div
            style={{ lineHeight: '32px' }}
            className={cx(
              'h-[32px] w-[84px] rounded-lg cursor-pointer text-center bg-white mb-8 text-gray-title font-medium mr-8 transition-colors',
              _value.includes(o) && [
                'border',
                'bg-gray-bg',
                'text-gray-comment',
                'border-gray-divider',
              ]
            )}
            key={o}
            onClick={() => handleChoose(o)}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TiledSelect;
