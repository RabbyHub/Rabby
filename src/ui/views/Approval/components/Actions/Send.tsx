import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ParsedActionData, SendRequireData } from './utils';
import { formatTokenAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import * as Values from './components/Values';
import LogoWithText from './components/LogoWithText';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import ViewMore from './components/ViewMore';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
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

const Send = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['send'];
  requireData: SendRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { rules, processedRules } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
    transferWhitelist: s.whitelist.whitelist,
    transferWhiteEnable: s.whitelist.enabled,
  }));

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
          <Row isTitle>Send token</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={`${formatTokenAmount(
                actionData.token.amount || 0
              )} ${ellipsisTokenSymbol(actionData.token.symbol)}`}
              logoRadius="100%"
            />
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(actionData.token.price)
                    .times(actionData.token.amount)
                    .toFixed()
                )}{' '}
                @ {formatUsdValue(actionData.token.price)}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Send to</Row>
          <Row>
            <div>
              <Values.Address address={actionData.to} chain={chain} />
              <ul className="desc-list">
                <li>
                  <Values.AddressMemo address={actionData.to} />
                </li>
                {requireData.name && <li>{requireData.name}</li>}
                {engineResultMap['1016'] && (
                  <li>
                    Token address
                    <SecurityLevelTagNoText
                      level={
                        processedRules.includes('1016')
                          ? 'proceed'
                          : engineResultMap['1016'].level
                      }
                      onClick={() => handleClickRule('1016')}
                    />
                  </li>
                )}
                {engineResultMap['1019'] && (
                  <li>
                    Contract address not on this chain
                    <SecurityLevelTagNoText
                      level={
                        processedRules.includes('1019')
                          ? 'proceed'
                          : engineResultMap['1019'].level
                      }
                      onClick={() => handleClickRule('1019')}
                    />
                  </li>
                )}
                {requireData.cex && (
                  <>
                    <li>
                      <LogoWithText
                        logo={requireData.cex.logo}
                        text={requireData.cex.name}
                      />
                    </li>
                    {engineResultMap['1021'] && (
                      <li>
                        Not top up address{' '}
                        {engineResultMap['1021'] && (
                          <SecurityLevelTagNoText
                            level={
                              processedRules.includes('1021')
                                ? 'proceed'
                                : engineResultMap['1021'].level
                            }
                            onClick={() => handleClickRule('1021')}
                          />
                        )}
                      </li>
                    )}
                    {engineResultMap['1020'] && (
                      <li>
                        {ellipsisTokenSymbol(actionData.token.symbol)} not
                        supported
                        <SecurityLevelTagNoText
                          level={
                            processedRules.includes('1020')
                              ? 'proceed'
                              : engineResultMap['1020'].level
                          }
                          onClick={() => handleClickRule('1020')}
                        />
                      </li>
                    )}
                  </>
                )}
                {engineResultMap['1018'] && (
                  <li>
                    Never transacted before
                    <SecurityLevelTagNoText
                      level={
                        processedRules.includes('1018')
                          ? 'proceed'
                          : engineResultMap['1018'].level
                      }
                      onClick={() => handleClickRule('1018')}
                    />
                  </li>
                )}
                {engineResultMap['1033'] && (
                  <li>
                    On my send whitelist
                    <SecurityLevelTagNoText
                      level={
                        processedRules.includes('1033')
                          ? 'proceed'
                          : engineResultMap['1033'].level
                      }
                      onClick={() => handleClickRule('1033')}
                    />
                  </li>
                )}
              </ul>
            </div>
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default Send;
