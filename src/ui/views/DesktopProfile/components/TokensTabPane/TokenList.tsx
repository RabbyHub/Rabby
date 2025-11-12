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
import type { NetSwitchTabsKey } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import MainnetTestnetSwitchTabs from './components/switchTestTab';
import { CustomTestnetAssetList } from './TestTokenlist';

export interface Props {
  list?: TokenItemProps['item'][];
  isNoResults?: boolean;
  allMode?: boolean;
  onAllModeChange?: (allMode: boolean) => void;
  totalValue?: number;
  selectedTab?: NetSwitchTabsKey;
  onTabChange?: (tab: NetSwitchTabsKey) => void;
}
const AllModeSwitchWrapper = styled.div`
  .ant-switch-checked {
    background-color: var(--r-green-default) !important;
  }
`;

const ListContainer = styled.div`
  background-color: var(--rb-neutral-bg-3, #f9f9f9);
  border-radius: 16px;
  padding: 16px;
  margin: 0 20px 20px;
`;

export const TokenList = ({
  list,
  isNoResults,
  allMode,
  onAllModeChange,
  totalValue,
  selectedTab,
  onTabChange,
}: Props) => {
  const {
    result: currentList,
    isExpanded,
    toggleExpand,
    hasExpandSwitch,
  } = useExpandList(list, totalValue);

  const {
    result: allOverZeroList,
    isExpanded: allOverZeroExpanded,
    toggleExpand: allOverZeroToggleExpand,
    hasExpandSwitch: allOverZeroHasExpandSwitch,
  } = useExpandList(list, 0, false, true);
  const { t } = useTranslation();

  return (
    <div
      className="mt-[26px] protocol-item-wrapper"
      id={TOKEN_WALLET_ANCHOR_ID}
    >
      <div className="flex items-center justify-between py-[14px] px-[20px]">
        <div className="flex items-center gap-[16px]">
          <div className="flex items-center gap-[6px]">
            <RcWalletIconCC className="w-[20px] h-[20px] text-r-blue-default" />
            <div className="text-[20px] leading-[24px] font-semibold text-r-neutral-title1">
              {t('page.desktopProfile.portfolio.headers.wallet')}
            </div>
          </div>
          <AllModeSwitchWrapper className="flex items-center gap-[6px]">
            <Switch checked={allMode} onChange={onAllModeChange} />
            <div className="text-[14px] leading-[16px] font-normal text-rb-neutral-body">
              {t('page.desktopProfile.portfolio.headers.allTokenMode')}
            </div>
          </AllModeSwitchWrapper>
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
        {selectedTab === 'mainnet' || !allMode ? (
          isNoResults ? (
            <TokenListEmpty text={t('page.dashboard.assets.table.noTokens')} />
          ) : (
            <>
              <TokenTable
                list={
                  allMode
                    ? (allOverZeroList as TokenItemProps['item'][])
                    : (currentList as TokenItemProps['item'][])
                }
                EmptyComponent={<div></div>}
              />
              {allMode
                ? allOverZeroHasExpandSwitch && (
                    <div
                      onClick={allOverZeroToggleExpand}
                      className="flex items-center justify-center gap-4 py-[16px]"
                    >
                      <div className="text-rb-neutral-secondary text-13 cursor-pointer">
                        {allOverZeroExpanded
                          ? t(
                              'page.desktopProfile.portfolio.hidden.tokensWithZeroBalance'
                            )
                          : t(
                              'page.desktopProfile.portfolio.hidden.tokensWithZeroBalanceDesc'
                            )}
                      </div>
                      <div className="flex items-center justify-center gap-[2px] cursor-pointer">
                        {allOverZeroExpanded ? null : (
                          <div className="text-rb-neutral-secondary text-13 underline">
                            {t('page.desktopProfile.portfolio.hidden.showAll')}
                          </div>
                        )}
                        <RcIconDropdown
                          className={clsx('ml-0 text-rb-neutral-secondary', {
                            'transform rotate-180': allOverZeroExpanded,
                          })}
                        />
                      </div>
                    </div>
                  )
                : hasExpandSwitch && (
                    <div
                      onClick={toggleExpand}
                      className="flex items-center justify-center gap-4 py-[16px]"
                    >
                      <div className="text-rb-neutral-secondary text-13 cursor-pointer">
                        {isExpanded
                          ? t('page.desktopProfile.portfolio.hidden.hideSmall')
                          : t(
                              'page.desktopProfile.portfolio.hidden.hideSmallDesc'
                            )}
                      </div>
                      <div className="flex items-center justify-center gap-[2px] cursor-pointer">
                        {isExpanded ? null : (
                          <div className="text-rb-neutral-secondary text-13 underline">
                            {t('page.desktopProfile.portfolio.hidden.showAll')}
                          </div>
                        )}
                        <RcIconDropdown
                          className={clsx('ml-0 text-rb-neutral-secondary', {
                            'transform rotate-180': isExpanded,
                          })}
                        />
                      </div>
                    </div>
                  )}
            </>
          )
        ) : (
          <CustomTestnetAssetList />
        )}
      </ListContainer>
    </div>
  );
};
