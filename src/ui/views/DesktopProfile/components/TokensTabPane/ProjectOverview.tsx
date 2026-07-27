import React from 'react';
import clsx from 'clsx';
import styled from 'styled-components';

import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown-cc.svg';
import { useTranslation } from 'react-i18next';
import { getAssetsProjectAnchorId, ScrollToAssetDomById } from './utils';

const ProjectOverviewItemWrapper = styled.div`
  border-radius: 12px;
  background-color: var(--rb-neutral-bg-3);
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 11px 10px;
  cursor: pointer;
  .title {
    display: flex;
    align-items: center;
    padding: 12px;
    cursor: pointer;

    .name {
      /* flex: 1; */
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      color: var(--r-neutral-title-1, #192945);
    }
    .net-worth {
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      text-align: right;
      color: var(--r-neutral-title-1, #192945);
    }
  }
`;

const ProjectOverviewItem = ({
  protocol,
  isAppChain,
}: {
  protocol: DisplayedProject;
  isAppChain?: boolean;
}) => {
  return (
    <ProjectOverviewItemWrapper
      onClick={() =>
        ScrollToAssetDomById(getAssetsProjectAnchorId(protocol.id))
      }
      className={clsx(
        'border-[1px] border-solid border-transparent',
        'hover:bg-r-blue-light1 hover:border-rabby-blue-default'
      )}
    >
      <IconWithChain
        iconUrl={protocol.logo}
        chainServerId={protocol.chain || 'eth'}
        width="20px"
        height="20px"
        chainSize="10px"
        noRound={isAppChain}
        isShowChainTooltip={true}
        hideChainIcon={isAppChain}
      />
      <div className="flex flex-col">
        <span className="name inline-flex items-center text-12 text-rb-neutral-foot truncate">
          {protocol.name}
        </span>
        <span className="text-[12px] text-rb-neutral-title-1 font-semibold">
          {protocol._netWorth}
        </span>
      </div>
    </ProjectOverviewItemWrapper>
  );
};

interface Props {
  list: DisplayedProject[];
  appIds?: string[];
  isExpanded?: boolean;
  toggleExpand?: () => void;
  hasExpandSwitch?: boolean;
  smallLength?: number;
}

const ProjectOverviewListWrapper = styled.div`
  margin-top: 20px;
  padding-left: 20px;
  padding-right: 20px;
`;

const ListWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
`;

const MAX_FOLD_LENGTH = 11; // 折叠情况下最多展示两行

const ProjectOverview = ({
  list,
  appIds,
  isExpanded,
  toggleExpand,
  smallLength,
  hasExpandSwitch,
}: Props) => {
  const { t } = useTranslation();

  const allLength = isExpanded ? list.length : (smallLength || 0) + list.length;
  const truncateLength =
    allLength > MAX_FOLD_LENGTH ? allLength - MAX_FOLD_LENGTH : smallLength;

  return (
    <ProjectOverviewListWrapper>
      <ListWrapper>
        {(isExpanded ? list : list.slice(0, MAX_FOLD_LENGTH)).map((item) => (
          <ProjectOverviewItem
            protocol={item}
            key={item.id}
            isAppChain={appIds?.includes(item.id)}
          />
        ))}
        {hasExpandSwitch && (
          <div
            onClick={toggleExpand}
            className="flex items-center justify-center gap-4 py-[16px]"
          >
            <div className="text-rb-neutral-secondary text-13 cursor-pointer">
              {isExpanded
                ? t('page.desktopProfile.portfolio.headers.foldDifis', {
                    count: truncateLength,
                  })
                : t('page.desktopProfile.portfolio.headers.unfoldDifis', {
                    count: truncateLength,
                  })}
            </div>
            <div className="flex items-center justify-center gap-[2px] cursor-pointer">
              <RcIconDropdown
                className={clsx('ml-0 text-rb-neutral-secondary', {
                  'transform rotate-180': isExpanded,
                })}
              />
            </div>
          </div>
        )}
      </ListWrapper>
    </ProjectOverviewListWrapper>
  );
};

export default ProjectOverview;
