import { Space, Tooltip } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { ReactComponent as IconInfo } from 'ui/assets/infoicon.svg';

const feeTips = {
  '0.3': '0.3% fee for common token',
  '0.1': '0.1% fee for stablecoins',
  '0':
    '0 fee to wrap/unwrap tokens by interacting directly with {WETH} contracts.',
};

export interface FeeProps {
  fee: '0.3' | '0.1' | '0';
}
export const Fee = (props: FeeProps) => {
  const { fee } = props;
  return (
    <div className="flex justify-between px-12">
      <Space size={4}>
        <div className="text-13 text-gray-title">Rabby fee</div>
        <Tooltip
          overlayClassName={clsx(
            'rectangle max-w-[360px]'
            //  left-[20px]'
            //   slippageTooltipsClassName
          )}
          placement="bottom"
          title={`The charged fee depends on which token you're swapping. It has been charged from the current quote.`}
        >
          <IconInfo />
        </Tooltip>
      </Space>
      <div className="text-right text-14 font-medium flex items-center">
        <span>
          {fee}
          {fee === '0' ? '' : '%'}
        </span>
        <Tooltip
          overlayClassName={clsx(
            'rectangle max-w-[360px]'
            //  left-[20px]'
            //   slippageTooltipsClassName
          )}
          placement="bottom"
          title={feeTips[fee]}
        >
          <IconInfo />
        </Tooltip>
      </div>
    </div>
  );
};
