import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ContractCallRequireData, ParsedActionData } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { ProtocolListItem } from './components/ProtocolListItem';

const Wrapper = styled.div`
  .contract-call-header {
    border-bottom: 1px solid #ededed;
    padding-bottom: 15px;
    .alert {
      display: flex;
      margin-bottom: 9px;
      align-items: center;
      font-weight: 500;
      font-size: 12px;
      line-height: 14px;
      color: #333333;
      .icon-alert {
        margin-right: 6px;
        width: 15px;
      }
    }
  }
  .header {
    margin-top: 15px;
  }
  .icon-edit-alias {
    width: 13px;
    height: 13px;
    cursor: pointer;
  }
  .icon-scam-token {
    margin-left: 4px;
    width: 13px;
  }
  .icon-fake-token {
    margin-left: 4px;
    width: 13px;
  }
`;

const ContractCall = ({
  requireData,
  chain,
}: {
  data: ParsedActionData['contractCall'];
  requireData: ContractCallRequireData;
  chain: Chain;
  raw: Record<string, string | number>;
  engineResults: Result[];
  onChange(tx: Record<string, any>): void;
}) => {
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Interact contract</Row>
          <Row>
            <div>
              <Values.Address address={requireData.id} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />
              <li>
                {requireData.hasInteraction
                  ? 'Interacted before'
                  : 'Never interacted before'}
              </li>
              <li>
                <ViewMore
                  type="contract"
                  data={{
                    hasInteraction: requireData.hasInteraction,
                    bornAt: requireData.bornAt,
                    protocol: requireData.protocol,
                    rank: requireData.rank,
                    address: requireData.id,
                    chain,
                  }}
                />
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Operation</Row>
          <Row>{requireData.call.func || '-'}</Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default ContractCall;
