import clsx from 'clsx';
import React from 'react';
import { ReactComponent as LowValueSVG } from '@/ui/assets/dashboard/low-value.svg';
import { ReactComponent as LowValueArrowSVG } from '@/ui/assets/dashboard/low-value-arrow.svg';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import BigNumber from 'bignumber.js';
import { splitNumberByStep, useCommonPopupView } from '@/ui/utils';
import { Popup } from '@/ui/component';
import { TokenTable } from './components/TokenTable';
import { TokenListEmpty } from './TokenListEmpty';
import { useTranslation } from 'react-i18next';

export interface Props {
  className?: string;
  list?: AbstractPortfolioToken[];
}

export const TokenLowValueItem: React.FC<Props> = ({ className, list }) => {
  const { t } = useTranslation();
  const totalValue = React.useMemo(() => {
    return list
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [list]);
  const [visible, setVisible] = React.useState(false);
  const { visible: commonPopupVisible } = useCommonPopupView();

  React.useEffect(() => {
    if (!commonPopupVisible) {
      setVisible(false);
    }
  }, [commonPopupVisible]);

  return (
    <div
      className={clsx(
        'flex justify-between border border-transparent items-center mt-8 bg-r-neutral-card1 rounded-[8px] px-16',
        'hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10',
        'cursor-pointer',
        className
      )}
      onClick={() => setVisible(true)}
    >
      <div className={clsx('text-r-neutral-foot text-13', 'flex items-center')}>
        <LowValueSVG className="mr-12" />
        <div className="text-r-neutral-foot">
          {t('page.dashboard.assets.table.lowValueTokens', {
            count: list?.length,
          })}
        </div>
      </div>
      <div className="text-13 text-r-neutral-foot font-medium">
        ${splitNumberByStep(totalValue?.toFixed(2) ?? '0')}
      </div>

      <Popup
        title={
          <div className="font-medium text-20">
            {t('page.dashboard.assets.table.lowValueTokens', {
              count: list?.length,
            })}
          </div>
        }
        isNew
        height={500}
        visible={visible}
        closable
        push={false}
        onClose={(e) => {
          e?.stopPropagation();
          setVisible(false);
        }}
        bodyStyle={{
          padding: '20px 20px 0',
        }}
        isSupportDarkMode
      >
        {list?.length ? (
          <TokenTable
            list={list}
            virtual={{
              height: 430,
              itemSize: 68,
            }}
          />
        ) : (
          <TokenListEmpty />
        )}
      </Popup>
    </div>
  );
};
