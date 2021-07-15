import React from 'react';
import cx from 'clsx';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSelectOption } from 'ui/utils';
import { SvgIconCross } from 'ui/assets';
import IconClear from 'ui/assets/clear.svg';

interface TiledSelectProps {
  correctValue?: string[];
  defaultValue?: string[];
  value?: string[];
  options: string[];
  onChange?(arg: string[]): void;
  className?: string;
  errMsg?: string;
}

const TiledSelect = ({
  defaultValue,
  value,
  options,
  onChange,
  className,
  errMsg = '',
  correctValue,
}: TiledSelectProps) => {
  const [
    _value,
    handleRemove,
    handleChoose,
    _,
    handleClear,
  ] = useSelectOption<string>({
    onChange,
    value,
    defaultValue,
    options,
  });
  const { t } = useTranslation();

  const handleClickOption = (i: number) => {
    if (correctValue) {
      if (options[i] !== correctValue[_value.length]) {
        message.error(t('Wrong mnemonic word'));
        return;
      }
    }
    handleChoose(i);
  };

  const handleClickClear = () => {
    handleClear();
  };

  return (
    <div className={className}>
      <div className="rounded-lg bg-white text-center font-medium mb-16 p-12 pr-0 h-[165px] relative">
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
        {errMsg && (
          <div
            className="flex text-12 justify-between absolute left-0 bottom-12 px-12 w-full cursor-pointer"
            onClick={handleClickClear}
          >
            <span className="text-red-light">{errMsg}</span>
            <span className="text-gray-subTitle flex">
              <img src={IconClear} className="w-[12px] h-[12px] mr-4" />
              Clear
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-between flex-wrap -mr-8 clear-left">
        {options.map((o, i) => (
          <div
            style={{ lineHeight: '32px' }}
            className={cx(
              (i + 1) % 4 === 0 ? 'mr-0' : 'mr-8',
              'h-[32px] w-[84px] rounded-lg cursor-pointer text-center mb-8 font-medium transition-colors border',
              _value.includes(o)
                ? 'bg-gray-bg text-gray-comment border-gray-divider'
                : 'bg-white text-gray-title border-white'
            )}
            key={o}
            onClick={() => handleClickOption(i)}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TiledSelect;
