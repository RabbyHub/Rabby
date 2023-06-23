import React from 'react';
import styled from 'styled-components';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import PortfolioTemplate from './ProtocolTemplates';

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
      color: #4b4d59;
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
  return (
    <ProtocolItemWrapper>
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
    </ProtocolItemWrapper>
  );
};

interface Props {
  list: DisplayedProject[] | undefined;
}

const ProtocolListWrapper = styled.div`
  margin-top: 30px;
`;

const ProtocolList = ({ list }: Props) => {
  if (!list) return null;
  return (
    <ProtocolListWrapper>
      {list.map((item) => (
        <ProtocolItem protocol={item} key={item.id} />
      ))}
    </ProtocolListWrapper>
  );
};

export default ProtocolList;
