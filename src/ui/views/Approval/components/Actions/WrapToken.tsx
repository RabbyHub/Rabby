import React, { useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import { ParsedActionData, WrapTokenRequireData } from './utils';
import { formatAmount } from 'ui/utils/number';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { Chain } from 'background/service/openapi';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import ViewMore from './components/ViewMore';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { SecurityListItem } from './components/SecurityListItem';

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
`;

const WrapToken = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['wrapToken'];
  requireData: WrapTokenRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const { payToken, receiveToken, receiver } = data!;

  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));
  const dispatch = useRabbyDispatch();

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

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
          <Row isTitle>Pay token</Row>
          <Row>
            <LogoWithText
              logo={payToken.logo_url}
              text={`${formatAmount(payToken.amount)} ${ellipsisTokenSymbol(
                payToken.symbol
              )}`}
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle>Receive token</Row>
          <Row>
            <LogoWithText
              logo={receiveToken.logo_url}
              text={`${formatAmount(
                receiveToken.min_amount
              )} ${ellipsisTokenSymbol(receiveToken.symbol)}`}
              logoRadius="100%"
            />
            {engineResultMap['1061'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1061'].enable}
                level={
                  processedRules.includes('1061')
                    ? 'proceed'
                    : engineResultMap['1061'].level
                }
                onClick={() => handleClickRule('1061')}
              />
            )}
          </Row>
        </Col>
        {engineResultMap['1092'] && (
          <Col>
            <Row isTitle>Receiver</Row>
            <Row>
              <Values.Address address={receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  engineResult={engineResultMap['1092']}
                  id="1092"
                  dangerText="Not your current address"
                />
              </ul>
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Interact contract</Row>
          <Row>
            <div>
              <Values.Address address={requireData.id} chain={chain} />
            </div>
            <ul className="desc-list">
              {requireData.protocol && (
                <li>
                  <Values.Protocol value={requireData.protocol} />
                </li>
              )}
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
      </Table>
    </Wrapper>
  );
};

export default WrapToken;
