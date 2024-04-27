import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import PortfolioTemplate from './ProtocolTemplates';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import clsx from 'clsx';
import { openInTab, useCommonPopupView } from '@/ui/utils';
import { ReactComponent as RcOpenExternalCC } from '@/ui/assets/open-external-cc.svg';

const TemplateDict = {
  common: PortfolioTemplate.Common,
  lending: PortfolioTemplate.Lending,
  locked: PortfolioTemplate.Locked,
  leveraged_farming: PortfolioTemplate.LeveragedFarming,
  vesting: PortfolioTemplate.Vesting,
  reward: PortfolioTemplate.Reward,
  options_seller: PortfolioTemplate.OptionsSeller,
  options_buyer: PortfolioTemplate.OptionsSeller,
  insurance_seller: PortfolioTemplate.Unsupported,
  insurance_buyer: PortfolioTemplate.Unsupported,
  perpetuals: PortfolioTemplate.Perpetuals,
  unsupported: PortfolioTemplate.Unsupported,
  nft_common: PortfolioTemplate.NftCommon,
  nft_lending: PortfolioTemplate.NftLending,
  nft_fraction: PortfolioTemplate.NftFraction,
  nft_p2p_lender: PortfolioTemplate.NftP2PLender,
  nft_p2p_borrower: PortfolioTemplate.NftP2PBorrower,
};

const PoolItemWrapper = styled.div`
  margin-bottom: 8px;
  &:nth-last-child(1) {
    margin-bottom: 0;
  }
`;

const PoolItem = ({ item }: { item: AbstractPortfolio }) => {
  const types = item._originPortfolio.detail_types?.reverse();
  const type =
    types?.find((t) => (t in TemplateDict ? t : '')) || 'unsupported';
  const PortfolioDetail = TemplateDict[type as keyof typeof TemplateDict];
  return (
    <PoolItemWrapper>
      <PortfolioDetail name={item._originPortfolio.name} data={item} />
    </PoolItemWrapper>
  );
};

const ProtocolItemWrapper = styled.div`
  background: var(--r-neutral-card-2, #f2f4f7);
  margin-bottom: 12px;
  border-radius: 6px;

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
const ProtocolItem = ({
  protocol,
  enableDelayVisible,
  isSearch,
}: {
  protocol: DisplayedProject;
  enableDelayVisible: boolean;
  isSearch?: boolean;
}) => {
  const [isExpand, setIsExpand] = useState(false);
  const { visible } = useCommonPopupView();
  const [delayVisible, setDelayVisible] = useState(false);

  const onClickTitle = useCallback(() => {
    setIsExpand((prev) => !prev);
  }, []);

  useEffect(() => {
    setIsExpand(!!isSearch);
  }, [isSearch]);

  useEffect(() => {
    if (!visible) {
      setDelayVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setDelayVisible(visible);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [visible]);

  if (enableDelayVisible && !delayVisible) {
    return null;
  }

  return (
    <ProtocolItemWrapper>
      <div>
        <div
          className={clsx(
            'flex items-center justify-start',
            'title border border-solid border-transparent rounded-[6px]',
            'hover:border-blue-light'
          )}
          onClick={onClickTitle}
        >
          <IconWithChain
            iconUrl={protocol.logo}
            chainServerId={protocol.chain || 'eth'}
            width="24px"
            height="24px"
            isShowChainTooltip={true}
          />
          <div
            className="ml-[8px] flex items-center border-b-[1px] border-b-solid border-transparent hover:border-b-rabby-neutral-foot"
            onClick={(evt) => {
              evt.stopPropagation();
              openInTab(protocol.site_url, false);
            }}
          >
            <span className="name inline-flex items-center">
              {protocol.name}
            </span>
            <RcOpenExternalCC className="ml-[4px] w-[12px] h-[12px] text-r-neutral-foot" />
          </div>
          <div className="flex items-center justify-end flex-1">
            <span className="net-worth">{protocol._netWorth}</span>
            <RcIconDropdown
              className={clsx('ml-8', {
                'transform rotate-180': isExpand,
              })}
            />
          </div>
        </div>
        {isExpand &&
          protocol._portfolios.map((portfolio) => (
            <PoolItem item={portfolio} key={portfolio.id} />
          ))}
      </div>
    </ProtocolItemWrapper>
  );
};

interface Props {
  list: DisplayedProject[] | undefined;
  isSearch?: boolean;
}

const ProtocolListWrapper = styled.div`
  margin-top: 30px;
`;

const ProtocolList = ({ list, isSearch }: Props) => {
  const enableDelayVisible = useMemo(() => {
    return (list || []).length > 100;
  }, [list]);

  if (!list) return null;

  return (
    <ProtocolListWrapper>
      {list.map((item) => (
        <ProtocolItem
          protocol={item}
          key={item.id}
          enableDelayVisible={enableDelayVisible}
          isSearch={isSearch}
        />
      ))}
    </ProtocolListWrapper>
  );
};

export default ProtocolList;
