import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ApproveNFTRequireData, ParsedActionData } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import * as Values from './components/Values';
import { ProtocolListItem } from './components/ProtocolListItem';
import ViewMore from './components/ViewMore';

const Wrapper = styled.div`
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
  li .name-and-address {
    justify-content: flex-start;
    .address {
      font-weight: 400;
      font-size: 12px;
      line-height: 14px;
      color: #999999;
    }
    img {
      width: 12px !important;
      height: 12px !important;
      margin-left: 4px !important;
    }
  }
`;

const RevokeNFTCollection = ({
  data,
  requireData,
  chain,
}: {
  data: ParsedActionData['approveNFTCollection'];
  requireData: ApproveNFTRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Revoke collection</Row>
          <Row>
            {actionData?.collection?.name}
            <ul className="desc-list">
              <li>
                <ViewMore
                  type="collection"
                  data={{
                    collection: actionData.collection,
                    chain,
                  }}
                />
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Revoke from</Row>
          <Row>
            <div>
              <Values.Address address={actionData.spender} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />

              <li>
                <span>
                  {requireData.hasInteraction
                    ? 'Interacted before'
                    : 'Never Interacted before'}
                </span>
              </li>

              <li>
                <ViewMore
                  type="nftSpender"
                  data={{
                    ...requireData,
                    spender: actionData.spender,
                    chain,
                    isRevoke: true,
                  }}
                />
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default RevokeNFTCollection;
