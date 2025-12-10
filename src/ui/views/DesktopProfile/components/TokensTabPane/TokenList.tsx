import React, { useMemo } from 'react';
import { Props as TokenItemProps } from '@/ui/views/CommonPopup/AssetList/TokenItem';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import { TokenTable } from './TokenTable';
import { useTranslation } from 'react-i18next';
import { Input, Switch } from 'antd';
import styled from 'styled-components';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import clsx from 'clsx';
import { TokenListEmpty } from './TokenListEmpty';
import { TOKEN_WALLET_ANCHOR_ID } from './constant';
import type { NetSwitchTabsKey } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import MainnetTestnetSwitchTabs from './components/switchTestTab';
import { CustomTestnetAssetList } from './TestTokenlist';

export interface Props {
  list?: TokenItemProps['item'][];
  isNoResults?: boolean;
  lpTokenMode?: boolean;
  onLpTokenModeChange?: (v: boolean) => void;
  totalValue?: number;
  selectedTab?: NetSwitchTabsKey;
  onTabChange?: (tab: NetSwitchTabsKey) => void;
}
const LpTokenSwitchWrapper = styled.div`
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
  lpTokenMode,
  onLpTokenModeChange,
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

  const { t } = useTranslation();

  const [searchValue, setSearchValue] = React.useState('');

  const displayTokenList = useMemo(() => {
    const v = searchValue.trim().toLowerCase();
    if (!v) {
      return currentList;
    }
    return currentList?.filter(
      (item) =>
        item.symbol.toLowerCase().includes(v) ||
        item.name.toLowerCase().includes(v) ||
        item.id.toLowerCase().includes(v)
    );
  }, [searchValue, currentList]);

  React.useEffect(() => {
    setSearchValue('');
  }, [lpTokenMode, selectedTab]);

  return (
    <div className="protocol-item-wrapper" id={TOKEN_WALLET_ANCHOR_ID}>
      <div className="flex items-center justify-between py-[14px] px-[20px]">
        <div className="flex items-center gap-[16px]">
          <Input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={clsx(
              'w-[345px] h-[40px]',
              'px-12 text-rb-neutral-title-1 text-[14px]',
              'bg-rb-neutral-card-1',
              'border border-rb-neutral-line focus-visible:border-rb-brand-default  rounded-[12px]'
            )}
            placeholder={t('page.dashboard.assets.table.searchToken')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-[16px]">
          <LpTokenSwitchWrapper className="flex items-center gap-[6px]">
            <Switch checked={lpTokenMode} onChange={onLpTokenModeChange} />
            <div className="text-[14px] leading-[16px] font-normal text-rb-neutral-body">
              {t('page.desktopProfile.portfolio.headers.lpToken')}
            </div>
          </LpTokenSwitchWrapper>
          <MainnetTestnetSwitchTabs
            value={selectedTab}
            onTabChange={onTabChange}
          />
        </div>
      </div>
      <ListContainer>
        {selectedTab === 'mainnet' || !lpTokenMode ? (
          isNoResults ? (
            <TokenListEmpty text={t('page.dashboard.assets.table.noTokens')} />
          ) : (
            <>
              <TokenTable
                list={displayTokenList}
                EmptyComponent={<div></div>}
              />
              {hasExpandSwitch && (
                <div
                  onClick={toggleExpand}
                  className="flex items-center justify-center gap-4 py-[16px]"
                >
                  <div className="text-rb-neutral-secondary text-13 cursor-pointer">
                    {isExpanded
                      ? t('page.desktopProfile.portfolio.hidden.hideSmall')
                      : t('page.desktopProfile.portfolio.hidden.hideSmallDesc')}
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
