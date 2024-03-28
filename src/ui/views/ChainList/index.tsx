import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { getChainList, getMainnetChainList } from '@/utils/chain';
import { Chain } from '@debank/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from 'ui/component';
import './style.less';

const List = ({ list }: { list: Chain[] }) => {
  return (
    <div className="overflow-auto max-h-full">
      <div className="chain-list">
        {list.map((item) => {
          return (
            <div className="chain-list-item" key={item.id}>
              <img src={item.logo} alt="" />
              <TooltipWithMagnetArrow
                title={item.name}
                className="rectangle w-[max-content]"
              >
                <span className="overflow-hidden overflow-ellipsis">
                  {item.name}
                </span>
              </TooltipWithMagnetArrow>
            </div>
          );
        })}
        {list.length % 2 !== 0 && <div className="chain-list-item"></div>}
      </div>
    </div>
  );
};

const ChainList = () => {
  const { t } = useTranslation();

  const list = getChainList('mainnet');

  return (
    <div className="page-chain-list">
      <PageHeader className="transparent-wrap" canBack={false} closeable fixed>
        {t('page.chainList.title', { count: list.length })}
      </PageHeader>

      <List list={list} />
    </div>
  );
};

export default ChainList;
