import React from 'react';
import { Props as TokenItemProps } from '@/ui/views/CommonPopup/AssetList/TokenItem';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import { TokenTable } from './TokenTable';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import clsx from 'clsx';
import { TokenListEmpty } from './TokenListEmpty';
import { TOKEN_WALLET_ANCHOR_ID } from './constant';
import type { NetSwitchTabsKey } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { CustomTestnetAssetList } from './TestTokenlist';

import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import { concatAndSort } from '@/ui/utils/portfolio/tokenUtils';

export interface Props {
  list?: TokenItemProps['item'][];
  isNoResults?: boolean;
  totalValue?: number;
  selectedTab?: NetSwitchTabsKey;
  isSearch: boolean;
  searchList: AbstractPortfolioToken[];
  search?: string;
  lpTokenMode?: boolean;
}

const ListContainer = styled.div`
  background-color: var(--rb-neutral-bg-3, #f9f9f9);
  border-radius: 16px;
  padding: 16px;
  margin: 0 20px 20px;
`;

export const TokenList = ({
  list,
  isNoResults,
  totalValue,
  selectedTab,
  isSearch,
  searchList,
  search,
  lpTokenMode,
}: Props) => {
  const {
    result: currentList,
    isExpanded,
    toggleExpand,
    hasExpandSwitch,
  } = useExpandList(list, totalValue);

  const { t } = useTranslation();

  return (
    <div className="protocol-item-wrapper" id={TOKEN_WALLET_ANCHOR_ID}>
      <ListContainer>
        {selectedTab === 'mainnet' ? (
          isNoResults ? (
            <TokenListEmpty
              text={
                lpTokenMode
                  ? t('page.dashboard.assets.table.noLpTokens')
                  : t('page.dashboard.assets.table.noTokens')
              }
            />
          ) : (
            <>
              <TokenTable
                list={
                  isSearch
                    ? concatAndSort(searchList, list || [], search || '')
                    : currentList
                }
                EmptyComponent={
                  isSearch ? (
                    <TokenListEmpty
                      // className="mt-[92px]"
                      text={t('page.dashboard.assets.table.noMatch')}
                    />
                  ) : lpTokenMode ? (
                    <TokenListEmpty
                      text={t('page.dashboard.assets.table.noLpTokens')}
                    />
                  ) : (
                    <div></div>
                  )
                }
              />
              {isSearch
                ? null
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
          <CustomTestnetAssetList search={search} />
        )}
      </ListContainer>
    </div>
  );
};
