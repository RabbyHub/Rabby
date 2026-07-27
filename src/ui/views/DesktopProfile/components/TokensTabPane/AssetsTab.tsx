import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

import { AbstractProject } from '@/ui/utils/portfolio/types';
import { DisplayedProject } from '@/ui/utils/portfolio/project';
import { TokenListViewSkeleton } from '@/ui/views/CommonPopup/AssetList/TokenListViewSkeleton';
import { HomePerpsPositionList } from '@/ui/views/CommonPopup/AssetList/HomePerpsPositionList';
import ProtocolList from './ProtocolList';
import ProjectOverview from './ProjectOverview';
import { TokenListEmpty } from './TokenListEmpty';
import { useExpandList } from './useExpandList';
import {
  ASSETS_CONTENT_ID,
  DEFI_OVERVIEW_ID,
  TOKENS_SECTION_ID,
} from './constant';

const ListContainer = styled.div`
  background-color: var(--rb-neutral-bg-3, #f9f9f9);
  border-radius: 16px;
  padding: 16px;
  margin: 0 20px 20px;
`;

interface Props {
  children: React.ReactNode;
  onProjectOverviewListChange: (projects: AbstractProject[]) => void;
  appIds: string[];
  displayPortfolios: DisplayedProject[];
  currentPortfolioNetWorth: number;
  isDefiLoading: boolean;
  removeProtocol: (id: string) => void;
}

export const AssetsTab = ({
  children,
  appIds,
  displayPortfolios,
  currentPortfolioNetWorth,
  removeProtocol,
  isDefiLoading,
  onProjectOverviewListChange,
}: Props) => {
  const { t } = useTranslation();

  const {
    isExpanded,
    result: currentList,
    toggleExpand,
    hasExpandSwitch,
    smallLength,
  } = useExpandList(displayPortfolios, currentPortfolioNetWorth);

  useEffect(() => {
    if (isDefiLoading || !currentList?.length) {
      onProjectOverviewListChange([]);
      return;
    }
    onProjectOverviewListChange(currentList);
  }, [currentList, isDefiLoading, onProjectOverviewListChange]);

  return (
    <div id={ASSETS_CONTENT_ID}>
      <div id={TOKENS_SECTION_ID}>{children}</div>

      <div id={DEFI_OVERVIEW_ID}>
        {!isDefiLoading && !!currentList?.length && (
          <ProjectOverview
            list={currentList}
            appIds={appIds}
            isExpanded={isExpanded}
            smallLength={smallLength}
            toggleExpand={toggleExpand}
            hasExpandSwitch={hasExpandSwitch}
          />
        )}
      </div>

      {isDefiLoading ? (
        <div className="mx-20">
          <TokenListViewSkeleton />
        </div>
      ) : !currentList?.length ? (
        <ListContainer className="mt-20">
          <TokenListEmpty text={t('page.dashboard.assets.table.noMatch')} />
        </ListContainer>
      ) : (
        <>
          <HomePerpsPositionList needFetchMarket />
          <ProtocolList
            removeProtocol={removeProtocol}
            appIds={appIds}
            list={currentList}
            isExpanded={isExpanded}
            toggleExpand={toggleExpand}
            hasExpandSwitch={hasExpandSwitch}
          />
        </>
      )}
    </div>
  );
};
