import clsx from 'clsx';
import { memo, useMemo, useCallback, ChangeEventHandler } from 'react';
import { useToggle } from 'react-use';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import React from 'react';
import { Input } from 'antd';

export const SlippageItem = styled.div<{
  active?: boolean;
  error?: boolean;
  hasAmount?: boolean;
}>`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid transparent;
  cursor: pointer;
  border-radius: 6px;
  width: 52px;
  height: 28px;
  font-weight: 500;
  font-size: 12px;
  background: #f5f6fa;
  border-radius: 4px;
  &:hover {
    /* background: linear-gradient(
        0deg,
        rgba(134, 151, 255, 0.3),
        rgba(134, 151, 255, 0.3)
      ),
      rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2); */
  }
`;

const SLIPPAGE = ['0.1', '0.3', '0.5'];

const Wrapper = styled.section`
  .slippage {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input {
    font-weight: 500;
    font-size: 12px;
    /* color: white; */
    background: #f5f6fa;
    border: 1px solid #e5e9ef;
    border-radius: 4px;

    /* &.ant-input-affix-wrapper, */
    /* &:focus,
    &:active {
      border: 1px solid transparent;
    } */
    /* &:hover {
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: none;
    } */

    &:placeholder-shown {
      color: #707280;
    }
    .ant-input {
      border-radius: 0;
    }
  }

  .warning {
    padding: 10px;
    color: #ffb020;
    font-weight: 400;
    font-size: 12px;
    line-height: 14px;
    position: relative;
    border-radius: 4px;
    background: rgba(255, 176, 32, 0.1);
    margin-top: 12px;
  }
`;
interface SlippageProps {
  value: string;
  onChange: (n: string) => void;
  recommendValue?: number;
  open: boolean;
}
export const Slippage = memo((props: SlippageProps) => {
  const { open, value, onChange, recommendValue } = props;
  const [isCustom, setIsCustom] = useToggle(false);

  const [isLow, isHigh] = useMemo(() => {
    return [
      value?.trim() !== '' && Number(value || 0) < 0.1,
      value?.trim() !== '' && Number(value || 0) > 10,
    ];
  }, [value]);

  const setRecommendValue = useCallback(() => {
    onChange(new BigNumber(recommendValue || 0).times(100).toString());
  }, [onChange, recommendValue]);

  const tips = useMemo(() => {
    if (isLow) {
      return 'Low slippage may cause failed transactions due to high volatility';
    }
    if (isHigh) {
      return 'Transaction might be frontrun because of high slippage tolerance';
    }
    if (recommendValue) {
      return (
        <span>
          To prevent front-running, we recommend a slippage of{' '}
          <span
            onClick={setRecommendValue}
            className="underline cursor-pointer"
          >
            {new BigNumber(recommendValue || 0).times(100).toString()}
          </span>
          %
        </span>
      );
    }
    return null;
  }, [isHigh, isLow, recommendValue, setRecommendValue]);

  const onInputFocus: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      e.target?.select?.();
    },
    []
  );

  const onInputChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const v = e.target.value;
      if (/^\d*(\.\d*)?$/.test(v)) {
        onChange(Number(v) > 50 ? '50' : v);
      }
    },
    [onChange]
  );

  if (!tips && !open) {
    return null;
  }

  return (
    <Wrapper>
      <div
        className={clsx(
          'slippage transition-all',
          !open && 'h-0 overflow-hidden'
        )}
      >
        {SLIPPAGE.map((e) => (
          <SlippageItem
            key={e}
            onClick={(event) => {
              event.stopPropagation();
              setIsCustom(false);
              onChange(e);
            }}
            active={!isCustom && e === value}
          >
            {e}%
          </SlippageItem>
        ))}
        <div
          onClick={(event) => {
            event.stopPropagation();
            setIsCustom(true);
          }}
          className="flex-1"
        >
          <Input
            className={clsx('input')}
            bordered={false}
            value={value}
            onFocus={onInputFocus}
            onChange={onInputChange}
            placeholder="0.1"
            suffix={<div>%</div>}
          />
        </div>
      </div>

      {!!tips && <div className="warning">{tips}</div>}
    </Wrapper>
  );
});
