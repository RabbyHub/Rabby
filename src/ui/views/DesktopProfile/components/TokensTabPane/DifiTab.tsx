import React, { useEffect } from 'react';
import ProtocolList from './ProtocolList';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch } from '@/ui/store';
import {
  AbstractPortfolioToken,
  AbstractProject,
} from '@/ui/utils/portfolio/types';
import { useExpandList } from './useExpandList';
import ProjectOverview from './ProjectOverview';
import { TokenListEmpty } from './TokenListEmpty';
import { DisplayedProject } from '@/ui/utils/portfolio/project';
import styled from 'styled-components';
import { TokenListViewSkeleton } from '@/ui/views/CommonPopup/AssetList/TokenListViewSkeleton';
import { DesktopPerpsPositionList } from '../PerpsPositionList';

const ListContainer = styled.div`
  background-color: var(--rb-neutral-bg-3, #f9f9f9);
  border-radius: 16px;
  padding: 16px;
  margin: 0 20px 20px;
`;

interface Props {
  onProjectOverviewListChange?: (projects: AbstractProject[]) => void;
  appIds: string[];
  displayPortfolios: DisplayedProject[];
  currentPortfolioNetWorth: number;
  isLoading: boolean;
  isNoResults: boolean;
  removeProtocol: (id: string) => void;
}

export const DIFITab = ({
  appIds,
  displayPortfolios,
  currentPortfolioNetWorth,
  removeProtocol,
  isLoading,
  isNoResults,
  onProjectOverviewListChange,
}: Props) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  const setAllMode = (value: boolean) => {
    dispatch.preference.setDesktopTokensAllMode(value);
  };

  const {
    isExpanded,
    result: currentList,
    toggleExpand,
    hasExpandSwitch,
    smallLength,
  } = useExpandList(displayPortfolios, currentPortfolioNetWorth);

  const projectOverviewList = React.useMemo(() => {
    return [
      // getTokenWalletFakeProject(
      //   tokenListTotalValue,
      //   t('page.desktopProfile.portfolio.headers.wallet')
      // ),
      ...(currentList || []),
    ];
  }, [currentList]);

  useEffect(() => {
    if (isNoResults || projectOverviewList?.length <= 0) {
      onProjectOverviewListChange?.([]);
      return;
    }
    if (projectOverviewList) {
      onProjectOverviewListChange?.(projectOverviewList);
    }
  }, [projectOverviewList.length, isNoResults]);

  if (isLoading) {
    return (
      <div className="mx-20">
        <TokenListViewSkeleton />
      </div>
    );
  }

  if (!currentList?.length && !isLoading) {
    return (
      <ListContainer className="mt-20">
        <TokenListEmpty text={t('page.dashboard.assets.table.noMatch')} />
      </ListContainer>
    );
  }

  return (
    <>
      {!isNoResults && projectOverviewList?.length > 0 && (
        <ProjectOverview
          list={projectOverviewList}
          appIds={appIds}
          isExpanded={isExpanded}
          smallLength={smallLength}
          toggleExpand={toggleExpand}
          hasExpandSwitch={hasExpandSwitch}
          filterWallet
        />
      )}
      <DesktopPerpsPositionList />
      <ProtocolList
        removeProtocol={removeProtocol}
        appIds={appIds}
        list={currentList}
        isExpanded={isExpanded}
        toggleExpand={toggleExpand}
        hasExpandSwitch={hasExpandSwitch}
      />
    </>
  );
};
