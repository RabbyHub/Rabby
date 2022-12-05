import LessPalette, { ellipsis } from '@/ui/style/var-defs';
import { InputNumber, Space, Tooltip } from 'antd';
import clsx from 'clsx';
import React, { memo, useMemo } from 'react';
import { useCss, useToggle } from 'react-use';
import styled from 'styled-components';
import { ReactComponent as IconInfo } from '@/ui/assets/swap/info-outline.svg';
import { ReactComponent as IconTipDownArrow } from 'ui/assets/swap/arrow-tips-down.svg';
import IconArrowTips from 'ui/assets/swap/arrow.svg';
export const SlippageItem = styled.div<{
  active?: boolean;
  error?: boolean;
  hasAmount?: boolean;
}>`
  position: relative;
  width: 72px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  /* margin: 4px 0; */
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  background-color: ${(props) =>
    props.active
      ? props.error
        ? 'rgba(255,176,32,0.1)'
        : 'rgba(134, 151, 255, 0.1)'
      : '#f5f6fa'};
  color: ${(props) =>
    props.active
      ? props.error
        ? '#ffb020'
        : LessPalette['@primary-color']
      : LessPalette['@color-title']};
  border-color: ${(props) =>
    props.active
      ? props.error
        ? '#ffb020'
        : LessPalette['@primary-color']
      : 'transparent'};
  &::after {
    opacity: ${(props) => (props.active && props.hasAmount ? 1 : 0)};
    content: '';
    position: absolute;
    width: 15px;
    height: 15px;
    background-image: url(${IconArrowTips});
    background-repeat: no-repeat;
    left: 50%;
    bottom: -16px;
    transform: translateX(-50%);
  }
  & input {
    text-align: center;
    color: ${(props) =>
      props.active
        ? props.error
          ? '#ffb020'
          : LessPalette['@primary-color']
        : LessPalette['@color-title']};
  }
  & .ant-input-number-handler-wrap {
    display: none !important;
  }
`;

const SLIPPAGE = ['0.05', '0.5', '3'];

const tips =
  'Your transaction will revert if the price changes unfavorably by more than this percentage';

interface SlippageProps {
  value: string;
  onChange: (n: string) => void;
  amount?: string | number;
  symbol?: string;
}
export const Slippage = memo((props: SlippageProps) => {
  const { value, onChange, amount = '', symbol = '' } = props;
  const [open, setOpen] = useToggle(false);
  const [isCustom, setIsCustom] = useToggle(false);

  const [slippageError, isLow, isHigh] = useMemo(() => {
    const low = Number(value || 0) < 0.05;
    const high = Number(value || 0) > 10;
    return [low || high, low, high];
  }, [value]);

  const hasAmount = !!amount;

  const slippageTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 94px )',
    },
  });

  return (
    <section className={clsx('relative cursor-pointer px-12')}>
      <div className="flex justify-between" onClick={() => setOpen()}>
        <Space size={4}>
          <div className="text-13 text-gray-title">Slippage</div>
          <Tooltip
            overlayClassName={clsx(
              'rectangle max-w-[360px] left-[20px]',
              slippageTooltipsClassName
            )}
            placement="bottom"
            title={tips}
          >
            <IconInfo />
          </Tooltip>
        </Space>
        <div className="text-right text-13 font-medium flex items-center">
          {value} %
          <div
            className={clsx('ml-4', {
              'rotate-180': open,
            })}
          >
            <IconTipDownArrow />
          </div>
        </div>
      </div>

      <div
        className={clsx('flex justify-between items-center  rounded mt-8', {
          hidden: !open,
        })}
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
            hasAmount={hasAmount}
          >
            {e}%
          </SlippageItem>
        ))}
        <SlippageItem
          onClick={(event) => {
            event.stopPropagation();
            // setSlippage('custom');
            setIsCustom(true);
          }}
          active={isCustom}
          error={isCustom && slippageError}
          hasAmount={hasAmount}
        >
          {isCustom ? (
            <InputNumber
              autoFocus
              bordered={false}
              min={'0'}
              stringMode
              value={value}
              formatter={(value) => (value ? `${value}%` : '')}
              parser={(value) => (value ? value!.replace('%', '') : '')}
              onFocus={(e) => {
                e.target?.select?.();
              }}
              onInput={(e) => {
                if (!e) {
                  onChange(e || '');
                }
              }}
              onChange={(e) => {
                onChange(Number(e) > 50 ? '50' : e || '');
              }}
            />
          ) : (
            'Custom'
          )}
        </SlippageItem>
      </div>

      {amount && open && (
        <MinReceivedBox
          title={`Minimum received after slippage : ${amount} ${symbol}`}
        >
          Minimum received after slippage : {amount} {symbol}
        </MinReceivedBox>
      )}
      {isCustom && value.trim() === '' && (
        <div className="text-12 mt-8 text-gray-content">
          Please input the custom slippage
        </div>
      )}
      {isCustom && slippageError && (
        <SlippageTip warn>
          {isLow &&
            'Transaction might be reverted because of low slippage tolerance'}
          {isHigh &&
            'Transaction might be frontrun because of high slippage tolerance'}
        </SlippageTip>
      )}
    </section>
  );
});

const SlippageTip = styled.div<{
  error?: boolean;
  warn?: boolean;
}>`
  margin-top: 8px;
  font-size: 12px;
  line-height: 14px;
  font-weight: 400;
  color: ${(props) =>
    props.error
      ? LessPalette['@color-red']
      : props.warn
      ? LessPalette['@color-orange']
      : LessPalette['@color-comment']};
`;

const MinReceivedBox = styled.div`
  margin-top: 8px;
  width: 312px;
  height: 30px;
  background: #f5f6fa;
  border-radius: 2px;
  font-weight: 400;
  font-size: 12px;
  color: #4b4d59;
  display: flex;
  align-items: center;
  padding: 0 8px;
  ${ellipsis()}
`;
