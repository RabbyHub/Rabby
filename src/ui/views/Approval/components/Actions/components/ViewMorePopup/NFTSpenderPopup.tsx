import React from 'react';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';

interface NFTSpenderData {
  spender: string;
  chain: Chain;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  hasInteraction: boolean;
  bornAt: number | null;
  rank: number | null;
  riskExposure: number;
  isEOA: boolean;
  isDanger: boolean | null;
  isRevoke?: boolean;
}

export interface Props {
  data: NFTSpenderData;
}

export interface NFTSpenderPopupProps extends Props {
  type: 'nftSpender';
}

export const NFTSpenderPopup: React.FC<Props> = ({ data }) => {
  return (
    <div>
      <div className="title">
        {data.isRevoke ? 'Revoke from' : 'Approve to'}{' '}
        <Values.Address
          address={data.spender}
          chain={data.chain}
          iconWidth="14px"
        />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row className="bg-[#F6F8FF]">Protocol</Row>
          <Row>
            <Values.Protocol value={data.protocol} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Address type</Row>
          <Row>{data.isEOA ? 'EOA' : 'Contract'}</Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">
            {data.isEOA ? 'First on-chain' : 'Deployed time'}
          </Row>
          <Row>
            <Values.TimeSpan value={data.bornAt} />
          </Row>
        </Col>
        <Col>
          <Row
            tip="Trust value refers to the top NFT approved and exposed to this contract. A low trust value indicates either risk or inactivity for 180 days."
            className="bg-[#F6F8FF]"
          >
            Trust value
          </Row>
          <Row>
            {data.riskExposure === null ? (
              '-'
            ) : (
              <Values.USDValue value={data.riskExposure} />
            )}
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Popularity</Row>
          <Row>{data.rank ? `No.${data.rank} on ${data.chain.name}` : '-'}</Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Interacted before</Row>
          <Row>
            <Values.Boolean value={data.hasInteraction} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Address note</Row>
          <Row>
            <Values.AddressMemo address={data.spender} />
          </Row>
        </Col>
        {data.isDanger && (
          <Col>
            <Row className="bg-[#F6F8FF]">Flagged by Rabby</Row>
            <Row>
              <Values.Boolean value={!!data.isDanger} />
            </Row>
          </Col>
        )}
      </Table>
    </div>
  );
};
