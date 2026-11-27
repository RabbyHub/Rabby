import React, { useMemo } from 'react';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';

import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown-cc.svg';
import { ScrollToDomById } from './utils';
import { TOKEN_WALLET_ANCHOR_ID } from './constant';
import { ReactComponent as RcWalletIconCC } from 'ui/assets/wallet-cc.svg';
import { useTranslation } from 'react-i18next';
import styles from './ProjectOverview.module.css';

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
    <div
      onClick={handleGotoProject}
      className={cn(
        styles.projectOverviewItemWrapper,
        'border-[1px] border-solid border-transparent',
        'hover:bg-r-blue-light1 hover:border-rabby-blue-default'
      )}
    >
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
        <span className="name inline-flex items-center text-12 text-rb-neutral-foot truncate">
          {protocol.name}
        </span>
        <span className="text-[12px] text-rb-neutral-title-1 font-semibold">
          {protocol._netWorth}
        </span>
      </div>
    </div>
  );
};

interface Props {
  list: DisplayedProject[] | undefined;
  appIds?: string[];
  removeProtocol?: (id: string) => void;
  isExpanded?: boolean;
  toggleExpand?: () => void;
  hasExpandSwitch?: boolean;
  smallLength?: number;
  filterWallet?: boolean;
}

const MAX_FOLD_LENGTH = 11; // 折叠情况下最多展示两行

const ProjectOverview = ({
  list: originList,
  appIds,
  isExpanded,
  toggleExpand,
  smallLength,
  hasExpandSwitch,
  filterWallet,
}: Props) => {
  const { t } = useTranslation();
  const list = filterWallet
    ? originList?.filter((item) => item.id !== TOKEN_WALLET_ANCHOR_ID)
    : originList;

  const truncateLength = useMemo(() => {
    const allLength = isExpanded
      ? list?.length || 0
      : (smallLength || 0) + (list?.length || 0);
    if (allLength > MAX_FOLD_LENGTH) {
      return allLength - MAX_FOLD_LENGTH;
    }
    return smallLength;
  }, [isExpanded, smallLength, list]);
  if (!list) return null;

  return (
    <div className="mt-20 px-20">
      <div className="grid grid-cols-[repeat(6,1fr)] gap-12">
        {(isExpanded ? list : list?.slice(0, MAX_FOLD_LENGTH))?.map((item) => (
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
      </div>
    </div>
  );
};

export default ProjectOverview;
