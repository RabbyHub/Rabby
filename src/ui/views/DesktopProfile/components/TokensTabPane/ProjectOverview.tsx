import React from 'react';
import clsx from 'clsx';
import styled from 'styled-components';

import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import { ScrollToDomById } from './utils';
import { TOKEN_WALLET_ANCHOR_ID } from './constant';
import { ReactComponent as RcWalletIconCC } from 'ui/assets/wallet-cc.svg';

const ProjectOverviewItemWrapper = styled.div`
  border-radius: 12px;
  background-color: var(--r-neutral-bg-3, #f7fafc);
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
  const isTokenWallet = protocol.id === TOKEN_WALLET_ANCHOR_ID;
  const handleGotoProject = () => {
    ScrollToDomById(protocol.id);
  };
  return (
    <ProjectOverviewItemWrapper onClick={handleGotoProject}>
      {isTokenWallet ? (
        <RcWalletIconCC className="w-[20px] h-[20px]" />
      ) : (
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
      )}
      <div className="flex flex-col">
        <span className="name inline-flex items-center text-12 font-medium text-r-neutral-body truncate">
          {protocol.name}
        </span>
        <span className="text-[12px] text-r-neutral-title1 font-medium">
          {protocol._netWorth}
        </span>
      </div>
    </ProjectOverviewItemWrapper>
  );
};

interface Props {
  list: DisplayedProject[] | undefined;
  appIds?: string[];
  removeProtocol?: (id: string) => void;
  isExpanded?: boolean;
  toggleExpand?: () => void;
  hasExpandSwitch?: boolean;
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

const ProjectOverview = ({
  list,
  appIds,
  isExpanded,
  toggleExpand,
  hasExpandSwitch,
}: Props) => {
  if (!list) return null;

  return (
    <ProjectOverviewListWrapper>
      <ListWrapper>
        {list?.map((item) => (
          <ProjectOverviewItem
            protocol={item}
            key={item.id}
            isAppChain={appIds?.includes(item.id)}
          />
        ))}
      </ListWrapper>
      {hasExpandSwitch && (
        <div
          onClick={toggleExpand}
          className="flex items-center justify-center gap-4 py-[16px]"
        >
          <div className="text-r-neutral-foot text-13 cursor-pointer">
            {isExpanded
              ? 'Hide protocols with small deposits.'
              : 'Protocols with small deposits are not displayed.'}
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
    </ProjectOverviewListWrapper>
  );
};

export default ProjectOverview;
