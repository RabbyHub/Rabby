import React from 'react';
import { Props as TokenItemProps } from '@/ui/views/CommonPopup/AssetList/TokenItem';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import BigNumber from 'bignumber.js';
import { TokenTable } from './TokenTable';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcWalletIconCC } from 'ui/assets/wallet-cc.svg';
import { Switch } from 'antd';
import styled from 'styled-components';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import clsx from 'clsx';
import { numberWithCommasIsLtOne } from '@/ui/utils/number';
import { TokenListEmpty } from './TokenListEmpty';
import { TOKEN_WALLET_ANCHOR_ID } from './constant';
import { useSwitchNetTab } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import MainnetTestnetSwitchTabs from './components/switchTestTab';
import { CustomTestnetAssetList } from './TestTokenlist';

export interface Props {
  list?: TokenItemProps['item'][];
  isNoResults?: boolean;
  allMode?: boolean;
  onAllModeChange?: (allMode: boolean) => void;
  totalValue?: number;
}

const ListContainer = styled.div`
  background-color: var(--r-neutral-bg-3, #f7fafc);
  border-radius: 16px;
  padding: 16px;
  margin: 0 20px;
`;

export const TokenList = ({
  list,
  isNoResults,
  allMode,
  onAllModeChange,
  totalValue,
}: Props) => {
  const {
    result: currentList,
    isExpanded,
    toggleExpand,
    hasExpandSwitch,
  } = useExpandList(list, totalValue);
  const { t } = useTranslation();

  const { selectedTab, onTabChange } = useSwitchNetTab();
  console.log('CUSTOM_LOGGER:=>: selectedTab', selectedTab);

  if (isNoResults) {
    // TODO: 自适应撑满高度
    return <TokenListEmpty text={t('page.dashboard.assets.table.noTokens')} />;
  }
  return (
    <div className="mt-[7px]" id={TOKEN_WALLET_ANCHOR_ID}>
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
              All Token Mode
            </div>
          </div>
        </div>
        {allMode ? (
          <MainnetTestnetSwitchTabs
            value={selectedTab}
            onTabChange={onTabChange}
          />
        ) : (
          <div className="text-[20px] text-r-neutral-title1 font-semibold">
            ${numberWithCommasIsLtOne(totalValue || 0, 0)}
          </div>
        )}
      </div>
      <ListContainer>
        {selectedTab === 'mainnet' ? (
          <>
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
          </>
        ) : (
          <CustomTestnetAssetList />
        )}
      </ListContainer>
    </div>
  );
};
