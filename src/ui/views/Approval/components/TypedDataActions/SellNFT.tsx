import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ContractRequireData, TypedDataActionData } from './utils';
import { isSameAddress } from 'ui/utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import NFTWithName from '../Actions/components/NFTWithName';
import * as Values from '../Actions/components/Values';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import ViewMore from '../Actions/components/ViewMore';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';
import LogoWithText from '../Actions/components/LogoWithText';
import { ellipsisTokenSymbol } from '@/ui/utils/token';

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

const ApproveNFT = ({
  data,
  requireData,
  chain,
  engineResults,
  sender,
}: {
  data: TypedDataActionData['sellNFT'];
  requireData: ContractRequireData;
  chain: Chain;
  engineResults: Result[];
  sender: string;
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const hasReceiver = useMemo(() => {
    return !isSameAddress(actionData.receiver, sender);
  }, [actionData, sender]);

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>List NFT</Row>
          <Row>
            <NFTWithName nft={actionData.pay_nft}></NFTWithName>
            <ul className="desc-list">
              <li>
                <ViewMore
                  type="nft"
                  data={{
                    nft: actionData.pay_nft,
                    chain,
                  }}
                />
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Receive token</Row>
          <Row>
            <LogoWithText
              logo={actionData.receive_token.logo_url}
              text={`${formatAmount(
                actionData.receive_token.amount
              )} ${ellipsisTokenSymbol(actionData.receive_token.symbol)}`}
              logoRadius="100%"
            />
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(actionData.receive_token.amount)
                    .times(actionData.receive_token.price)
                    .toFixed()
                )}{' '}
                @{formatUsdValue(actionData.receive_token.price)}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Expire Time</Row>
          <Row>
            {actionData.expire_at ? (
              <Values.TimeSpanFuture to={Number(actionData.expire_at)} />
            ) : (
              '-'
            )}
          </Row>
        </Col>
        {hasReceiver && (
          <Col>
            <Row isTitle>Receiver</Row>
            <Row>
              <Values.Address address={actionData.receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  id="1052"
                  engineResult={engineResultMap['1052']}
                  dangerText="not your current address"
                />
              </ul>
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>List on</Row>
          <Row>
            <div>
              <Values.Address address={requireData.id} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />

              <SecurityListItem
                id="1043"
                engineResult={engineResultMap['1043']}
                dangerText="EOA address"
              />

              <SecurityListItem
                id="1048"
                engineResult={engineResultMap['1048']}
                warningText="Never Interacted before"
                defaultText="Interacted before"
              />

              <SecurityListItem
                id="1044"
                engineResult={engineResultMap['1044']}
                dangerText="Risk exposure ≤ $10,000"
                warningText="Risk exposure ≤ $100,000"
              />

              <SecurityListItem
                id="1045"
                engineResult={engineResultMap['1045']}
                warningText="Deployed time < 3 days"
              />

              <SecurityListItem
                id="1052"
                engineResult={engineResultMap['1052']}
                dangerText="Flagged by Rabby"
              />

              <li>
                <ViewMore
                  type="contract"
                  data={{
                    ...requireData,
                    address: requireData.id,
                    chain,
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

export default ApproveNFT;
