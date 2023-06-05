import React from 'react';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { SecurityListItemTag } from '../SecurityListItemTag';

interface SpenderData {
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
  engineResultMap: Record<string, Result>;
}

export interface Props {
  data: SpenderData;
}

export interface SpenderPopupProps extends Props {
  type: 'spender';
}

export const SpenderPopup: React.FC<Props> = ({ data }) => {
  return (
    <div>
      <div className="title">
        Approve to <Values.Address address={data.spender} chain={data.chain} />
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
          <Row>
            {data.isEOA ? 'EOA' : 'Contract'}
            <SecurityListItemTag
              id="1022"
              engineResult={data.engineResultMap['1022']}
            />
          </Row>
        </Col>
        <Col>
          <Row>{data.isEOA ? 'First on-chain' : 'Deployed'}</Row>
          <Row>
            <Values.TimeSpan value={data.bornAt} />
            <SecurityListItemTag
              id="1024"
              engineResult={data.engineResultMap['1024']}
            />
          </Row>
        </Col>
        <Col>
          <Row tip="The total risk exposure approved to this spender address">
            Risk exposure
          </Row>
          <Row>
            <Values.USDValue value={data.riskExposure} />
            <SecurityListItemTag
              id="1023"
              engineResult={data.engineResultMap['1023']}
            />
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
            <SecurityListItemTag
              id="1025"
              engineResult={data.engineResultMap['1025']}
            />
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
            <SecurityListItemTag
              id="1029"
              engineResult={data.engineResultMap['1029']}
            />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
