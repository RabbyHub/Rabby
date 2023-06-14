import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ContractRequireData, TypedDataActionData } from './utils';
import { isSameAddress } from 'ui/utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import NFTWithName from '../Actions/components/NFTWithName';
import * as Values from '../Actions/components/Values';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import ViewMore from '../Actions/components/ViewMore';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';
import LogoWithText from '../Actions/components/LogoWithText';
import { ellipsisTokenSymbol } from '@/ui/utils/token';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';

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
  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));
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

  const handleClickRule = (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    const result = engineResultMap[id];
    dispatch.securityEngine.openRuleDrawer({
      ruleConfig: rule,
      value: result?.value,
      level: result?.level,
      ignored: processedRules.includes(id),
    });
  };

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
              icon={
                <Values.TokenLabel
                  isFake={actionData.receive_token.is_verified === false}
                  isScam={
                    actionData.receive_token.is_verified !== false &&
                    !!actionData.receive_token.is_suspicious
                  }
                />
              }
            />
            {engineResultMap['1083'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1083'].enable}
                level={
                  processedRules.includes('1083')
                    ? 'proceed'
                    : engineResultMap['1083'].level
                }
                onClick={() => handleClickRule('1083')}
              />
            )}
            {engineResultMap['1084'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1084'].enable}
                level={
                  processedRules.includes('1084')
                    ? 'proceed'
                    : engineResultMap['1084'].level
                }
                onClick={() => handleClickRule('1084')}
              />
            )}
            <ul className="desc-list">
              <li>
                ≈
                {formatUsdValue(
                  new BigNumber(actionData.receive_token.amount)
                    .times(actionData.receive_token.price)
                    .toFixed()
                )}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Expire time</Row>
          <Row>
            {actionData.expire_at ? (
              <Values.TimeSpanFuture to={Number(actionData.expire_at)} />
            ) : (
              '-'
            )}
          </Row>
        </Col>
        {actionData.takers.length > 0 && (
          <Col>
            <Row isTitle>Specific buyer</Row>
            <Row>
              <Values.Address address={actionData.takers[0]} chain={chain} />
              {engineResultMap['1081'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1081'].enable}
                  level={
                    processedRules.includes('1081')
                      ? 'proceed'
                      : engineResultMap['1081'].level
                  }
                  onClick={() => handleClickRule('1081')}
                />
              )}
            </Row>
          </Col>
        )}
        {hasReceiver && (
          <Col>
            <Row isTitle>Receiver</Row>
            <Row>
              <Values.Address address={actionData.receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  id="1082"
                  engineResult={engineResultMap['1082']}
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
