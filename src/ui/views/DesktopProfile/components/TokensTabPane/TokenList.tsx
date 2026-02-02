import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown-cc.svg';
import type { NetSwitchTabsKey } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import { Props as TokenItemProps } from '@/ui/views/CommonPopup/AssetList/TokenItem';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CustomTestnetAssetList } from './TestTokenlist';
import { TokenListEmpty } from './TokenListEmpty';
import { TokenTable } from './TokenTable';
import { TOKEN_WALLET_ANCHOR_ID } from './constant';
import { useSticky } from '@/ui/hooks/useSticky';
import { concatAndSort } from '@/ui/utils/portfolio/tokenUtils';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import { uniqBy } from 'lodash';
import { useLocation } from 'react-router-dom';

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

  const { stickyRef, isSticky, observe } = useSticky<HTMLDivElement>(
    document.querySelector<HTMLDivElement>('.js-scroll-element')
  );

  const location = useLocation();

  useEffect(() => {
    if (isExpanded && location.pathname.includes('desktop/profile/tokens')) {
      requestAnimationFrame(() => {
        observe();
      });
    }
  }, [location.pathname]);

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
                    ? uniqBy(
                        concatAndSort(searchList, list || [], search || ''),
                        (token) => {
                          return `${token.chain}-${token.id}`;
                        }
                      )
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
                      className={clsx(
                        'mb-[-16px]',
                        'border-t',
                        isExpanded && isSticky
                          ? 'border-transparent'
                          : 'border-rb-neutral-bg-4'
                      )}
                      ref={stickyRef}
                      style={{
                        position: isExpanded ? 'sticky' : 'static',
                        bottom: 32,
                      }}
                    >
                      {isExpanded && isSticky ? (
                        <div className="h-[40px] flex items-center justify-center pointer-events-none">
                          <div
                            className={clsx(
                              'flex items-center gap-[4px] rounded-full bg-r-neutral-card-1',
                              'px-[16px] py-[8px] pointer-events-auto cursor-pointer'
                            )}
                            style={{
                              boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.12)',
                            }}
                            onClick={() => {
                              toggleExpand();
                              requestAnimationFrame(() => {
                                observe();
                              });
                            }}
                          >
                            <div className="text-rb-neutral-secondary text-[13px] leading-[16px]">
                              {t(
                                'page.desktopProfile.portfolio.hidden.hideSmall'
                              )}
                            </div>
                            <RcIconDropdown
                              className={clsx(
                                'ml-0 text-rb-neutral-secondary',
                                'transform rotate-180'
                              )}
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-center gap-4 py-[12px] cursor-pointer"
                          onClick={() => {
                            toggleExpand();
                            requestAnimationFrame(() => {
                              observe();
                            });
                          }}
                        >
                          <div className="text-rb-neutral-secondary text-[13px] leading-[16px]">
                            {isExpanded
                              ? t(
                                  'page.desktopProfile.portfolio.hidden.hideSmall'
                                )
                              : t(
                                  'page.desktopProfile.portfolio.hidden.hideSmallDesc'
                                )}
                          </div>
                          <div className="flex items-center justify-center gap-[2px] cursor-pointer">
                            {isExpanded ? null : (
                              <div className="text-rb-neutral-secondary text-[13px] leading-[16px] underline">
                                {t(
                                  'page.desktopProfile.portfolio.hidden.showAll'
                                )}
                              </div>
                            )}
                            <RcIconDropdown
                              className={clsx(
                                'ml-0 text-rb-neutral-secondary',
                                {
                                  'transform rotate-180': isExpanded,
                                }
                              )}
                            />
                          </div>
                        </div>
                      )}
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
