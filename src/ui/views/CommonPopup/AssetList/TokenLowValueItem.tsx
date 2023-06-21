import clsx from 'clsx';
import React from 'react';
import { ReactComponent as LowValueSVG } from '@/ui/assets/dashboard/low-value.svg';
import { ReactComponent as LowValueArrowSVG } from '@/ui/assets/dashboard/low-value-arrow.svg';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import BigNumber from 'bignumber.js';
import { splitNumberByStep } from '@/ui/utils';
import { Popup } from '@/ui/component';
import { TokenTable } from './components/TokenTable';

export interface Props {
  className?: string;
  list?: AbstractPortfolioToken[];
}

export const TokenLowValueItem: React.FC<Props> = ({ className, list }) => {
  const totalValue = React.useMemo(() => {
    return list
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [list]);
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={clsx('flex justify-between items-center mt-8', className)}>
      <div
        className={clsx(
          'text-black text-13',
          'flex items-center',
          'cursor-pointer',
          'hover:opacity-60'
        )}
        onClick={() => setVisible(true)}
      >
        <LowValueSVG className="mr-12" />
        <div className="font-medium">{list?.length} low value assets</div>
        <LowValueArrowSVG />
      </div>
      <div className="text-13 text-gray-title font-medium">
        ${splitNumberByStep(totalValue?.toFixed(2) ?? '0')}
      </div>

      <Popup
        title={
          <div className="font-medium text-20">
            {list?.length} low value assets
          </div>
        }
        height={494}
        visible={visible}
        closable
        push={false}
        onClose={() => setVisible(false)}
      >
        <TokenTable
          list={list}
          virtual={{
            height: 403,
            itemSize: 51,
          }}
        />
      </Popup>
    </div>
  );
};
