import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ParsedActionData, RevokeNFTRequireData } from './utils';
import { formatAmount } from 'ui/utils/number';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import NFTWithName from './components/NFTWithName';
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

const RevokeNFT = ({
  data,
  requireData,
  chain,
}: {
  data: ParsedActionData['revokeNFT'];
  requireData: RevokeNFTRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { userData } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Revoke NFT</Row>
          <Row>
            <NFTWithName nft={actionData?.nft}></NFTWithName>
            <ul className="desc-list">
              {actionData?.nft?.collection && (
                <li>
                  <div className="whitespace-nowrap overflow-hidden overflow-ellipsis">
                    {actionData?.nft?.collection?.name}
                  </div>
                </li>
              )}
              <li>
                Floor price{' '}
                {actionData?.nft?.collection?.floor_price ? (
                  <>
                    {formatAmount(actionData?.nft?.collection?.floor_price)}
                    ETH
                  </>
                ) : (
                  '-'
                )}
              </li>
              <li>
                <Values.Address
                  address={actionData.nft.contract_id}
                  chain={chain}
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
                  type="spender"
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

export default RevokeNFT;
