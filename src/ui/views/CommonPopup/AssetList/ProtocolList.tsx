import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useIntersection } from 'react-use';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import PortfolioTemplate from './ProtocolTemplates';
import { isSameAddress } from '@/ui/utils';

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
  margin-bottom: 20px;
  .title {
    display: flex;
    margin-bottom: 8px;
    align-items: center;
    .name {
      flex: 1;
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      color: #13141a;
      margin-left: 8px;
    }
    .net-worth {
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      text-align: right;
      color: #13141a;
    }
  }
`;
const ProtocolItem = ({ protocol }: { protocol: DisplayedProject }) => {
  const intersectionRef = React.useRef<HTMLDivElement>(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '-20px',
    threshold: 0,
  });
  const [isDisplay, setIsDisplay] = useState(true);
  const [height, setHeight] = useState(0);
  const isReady = useRef(false);

  useEffect(() => {
    console.log('intersection', intersection);
    if (
      intersection?.intersectionRatio &&
      intersection?.intersectionRatio > 0
    ) {
      setIsDisplay(true);
    } else {
      setIsDisplay(false);
    }
  }, [intersection]);

  useEffect(() => {
    isReady.current = true;
    if (intersectionRef.current) {
      const rect = intersectionRef.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, []);

  return (
    <ProtocolItemWrapper
      ref={intersectionRef}
      style={{
        height: height ? `${height}px` : undefined,
      }}
    >
      <div
        style={{
          display: isDisplay ? 'block' : 'none',
        }}
      >
        <div className="title">
          <IconWithChain
            iconUrl={protocol.logo}
            chainServerId={protocol.chain || 'eth'}
            width="24px"
            height="24px"
          />
          <span className="name">{protocol.name}</span>
          <span className="net-worth">{protocol._netWorth}</span>
        </div>
        {protocol._portfolios.map((portfolio) => (
          <PoolItem item={portfolio} />
        ))}
      </div>
    </ProtocolItemWrapper>
  );
};

interface Props {
  list: DisplayedProject[] | undefined;
  kw: string;
}

const ProtocolListWrapper = styled.div`
  margin-top: 30px;
`;

const ProtocolList = ({ list, kw }: Props) => {
  const displayList = useMemo(() => {
    if (!list || !kw) return list;
    const result: DisplayedProject[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const portfolios =
        item._rawPortfolios?.filter((portfolio) => {
          const hasToken = portfolio.asset_token_list.some((token) => {
            if (kw.length === 42 && kw.toLowerCase().startsWith('0x')) {
              return isSameAddress(token.id, kw);
            } else {
              const reg = new RegExp(kw, 'i');
              return (
                reg.test(token.display_symbol || '') ||
                reg.test(token.symbol) ||
                reg.test(token.display_symbol || '') ||
                reg.test(token.name)
              );
            }
          });
          return hasToken;
        }) || [];
      const project = new DisplayedProject(
        {
          chain: item.chain,
          id: item.id,
          logo_url: item.logo,
          name: item.name,
          site_url: item.site_url,
        },
        portfolios
      );
      if (portfolios.length > 0) {
        result.push(project);
      }
    }
    return result;
  }, [list, kw]);

  if (!displayList) return null;

  return (
    <ProtocolListWrapper>
      {displayList.map((item) => (
        <ProtocolItem protocol={item} key={item.id} />
      ))}
    </ProtocolListWrapper>
  );
};

export default ProtocolList;
