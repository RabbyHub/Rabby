import { Space, Tooltip } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { ReactComponent as IconQuestion } from '@/ui/assets/swap/question-outline.svg';
import { ReactComponent as IconInfo } from '@/ui/assets/swap/info-outline.svg';
import { useCss } from 'react-use';

const feeTips = {
  '0.3': () => '0.3% fee for common token',
  '0.1': () => '0.1% fee for stablecoins',
  '0': (symbol) =>
    `0 fee to wrap/unwrap tokens by interacting directly with ${symbol} contracts.`,
};

export interface FeeProps {
  fee: '0.3' | '0.1' | '0';
  symbol?: string;
}
export const Fee = (props: FeeProps) => {
  const { fee, symbol = '' } = props;
  const feeTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 88px )',
    },
  });
  const feeNumClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(100% - 30px )',
    },
  });
  return (
    <div className="flex justify-between px-12">
      <Space size={4}>
        <div className="text-13 text-gray-title">Rabby fee</div>
        <Tooltip
          overlayClassName={clsx(
            'rectangle max-w-[360px] left-[20px]',
            feeTooltipsClassName
          )}
          placement="bottom"
          title={
            "The charged fee depends on which token you're swapping. It has been charged from the current quote."
          }
        >
          <IconInfo />
        </Tooltip>
      </Space>
      <div className="text-right text-13 font-medium flex items-center">
        <span className="mr-4">
          {fee}
          {fee === '0' ? '' : '%'}
        </span>
        <Tooltip
          overlayClassName={clsx(
            'rectangle max-w-[360px] left-auto right-[20px]',
            feeNumClassName
          )}
          placement="bottom"
          title={feeTips[fee](symbol)}
        >
          <IconQuestion />
        </Tooltip>
      </div>
    </div>
  );
};
