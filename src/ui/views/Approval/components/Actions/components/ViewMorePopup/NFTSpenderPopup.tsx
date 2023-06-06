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
        <Values.Address address={data.spender} chain={data.chain} />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row>Protocol</Row>
          <Row>
            <Values.Protocol value={data.protocol} />
          </Row>
        </Col>
        <Col>
          <Row>Type</Row>
          <Row>{data.isEOA ? 'EOA' : 'Contract'}</Row>
        </Col>
        <Col>
          <Row>{data.isEOA ? 'First on-chain' : 'Deployed'}</Row>
          <Row>
            <Values.TimeSpan value={data.bornAt} />
          </Row>
        </Col>
        <Col>
          <Row tip="The USD value of the top NFT that has approved to this spender address">
            Risk exposure
          </Row>
          <Row>
            <Values.USDValue value={data.riskExposure} />
          </Row>
        </Col>
        <Col>
          <Row>Popularity</Row>
          <Row>{data.rank ? `No.${data.rank} on ${data.chain.name}` : '-'}</Row>
        </Col>
        <Col>
          <Row>Interacted before</Row>
          <Row>
            <Values.Boolean value={data.hasInteraction} />
          </Row>
        </Col>
        <Col>
          <Row>Address note</Row>
          <Row>
            <Values.AddressMemo address={data.spender} />
          </Row>
        </Col>
        <Col>
          <Row>Flagged by Rabby</Row>
          <Row>
            <Values.Boolean value={!!data.isDanger} />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
