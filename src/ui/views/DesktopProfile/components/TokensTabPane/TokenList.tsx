import React from 'react';
import { Props as TokenItemProps } from '@/ui/views/CommonPopup/AssetList/TokenItem';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import BigNumber from 'bignumber.js';
import { TokenTable } from './TokenTable';
import { TokenListEmpty } from '@/ui/views/CommonPopup/AssetList/TokenListEmpty';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcWalletIconCC } from 'ui/assets/wallet-cc.svg';
import { Switch } from 'antd';
import styled from 'styled-components';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import clsx from 'clsx';
import { formatUsdValueKMB } from '@/ui/views/Dashboard/components/TokenDetailPopup/utils';

export interface Props {
  list?: TokenItemProps['item'][];
  isNoResults?: boolean;
  allMode?: boolean;
  onAllModeChange?: (allMode: boolean) => void;
}

const ListContainer = styled.div`
  border-width: 0.5px;
  border-style: solid;
  border-color: var(--r-neutral-line);
  border-radius: 8px;
  padding: 16px;
  margin: 0 20px;
`;

export const TokenList = ({
  list,
  isNoResults,
  allMode,
  onAllModeChange,
}: Props) => {
  const totalValue = React.useMemo(() => {
    return list
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [list]);

  const {
    result: currentList,
    isExpanded,
    toggleExpand,
    hasExpandSwitch,
  } = useExpandList(list, totalValue);
  const { t } = useTranslation();

  if (isNoResults) {
    return (
      <TokenListEmpty
        className="mt-[92px]"
        text={t('page.dashboard.assets.table.noMatch')}
      />
    );
  }
  return (
    <div className="mt-[7px]">
      <div className="flex items-center justify-between py-[14px] px-[20px]">
        <div className="flex items-center gap-[16px]">
          <div className="flex items-center gap-[6px]">
            <RcWalletIconCC className="w-[20px] h-[20px] text-r-blue-default" />
            <div className="text-r-neutral-title1 text-[15px] font-medium">
              Wallet
            </div>
          </div>
          <div className="flex items-center gap-[6px]">
            <Switch checked={allMode} onChange={onAllModeChange} />
            <div className="text-[13px] font-normal text-r-neutral-body">
              View All Token
            </div>
          </div>
        </div>
        <div className="text-[15px] text-r-neutral-title1 font-medium">
          {formatUsdValueKMB(totalValue || 0)}
        </div>
      </div>
      <ListContainer>
        <TokenTable
          list={allMode ? list : (currentList as TokenItemProps['item'][])}
          EmptyComponent={<div></div>}
        />
        {hasExpandSwitch && !allMode && (
          <div
            onClick={toggleExpand}
            className="flex items-center justify-center gap-4 py-[16px]"
          >
            <div className="text-r-neutral-foot text-13 cursor-pointer">
              {isExpanded
                ? 'Hide tokens with small balances.'
                : 'Tokens with small balances are not displayed.'}
            </div>
            <div className="flex items-center justify-center gap-[2px] cursor-pointer">
              {isExpanded ? null : (
                <div className="text-r-neutral-foot text-13 underline">
                  Show all
                </div>
              )}
              <RcIconDropdown
                className={clsx('ml-0', {
                  'transform rotate-180': isExpanded,
                })}
              />
            </div>
          </div>
        )}
      </ListContainer>
    </div>
  );
};
