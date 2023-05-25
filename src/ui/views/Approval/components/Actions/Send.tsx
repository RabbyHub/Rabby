import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ParsedActionData, SendRequireData } from './utils';
import { formatUsdValue } from 'ui/utils/number';
import { ellipsis } from 'ui/utils/address';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import * as Values from './components/Values';
import LogoWithText from './components/LogoWithText';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';

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
  const {
    userData,
    rules,
    processedRules,
    transferWhitelist,
    transferWhiteEnable,
  } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
    transferWhitelist: s.whitelist.whitelist,
    transferWhiteEnable: s.whitelist.enabled,
  }));

  const receiverInWhitelist = useMemo(() => {
    return userData.addressWhitelist.includes(actionData.to.toLowerCase());
  }, [userData, actionData]);
  const receiverInBlacklist = useMemo(() => {
    return userData.addressBlacklist.includes(actionData.to.toLowerCase());
  }, [userData, actionData]);

  const receiverType = useMemo(() => {
    if (requireData.contract) {
      return 'Contract';
    }
    if (requireData.eoa) {
      return 'EOA';
    }
    if (requireData.cex) {
      return 'EOA';
    }
  }, [requireData]);

  const contractOnCurrentChain = useMemo(() => {
    if (!requireData.contract || !requireData.contract[chain.serverId])
      return null;
    return requireData.contract[chain.serverId];
  }, [requireData, chain]);

  const timeSpan = useMemo(() => {
    let bornAt = 0;
    if (requireData.contract) {
      if (contractOnCurrentChain) {
        bornAt = contractOnCurrentChain.create_at;
      } else {
        return '-';
      }
    }
    if (requireData.cex) bornAt = requireData.cex.bornAt;
    if (requireData.eoa) bornAt = requireData.eoa.bornAt;
    const { d, h, m } = getTimeSpan(Math.floor(Date.now() / 1000) - bornAt);
    if (d > 0) {
      return `${d} Day${d > 1 ? 's' : ''} ago`;
    }
    if (h > 0) {
      return `${h} Hour${h > 1 ? 's' : ''} ago`;
    }
    if (m > 1) {
      return `${m} Minutes ago`;
    }
    return '1 Minute ago';
  }, [requireData]);

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
          <Row isTitle>Send Token</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={ellipsisTokenSymbol(actionData.token.symbol)}
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
      </Table>
      <div className="header">
        <div className="left">{ellipsis(actionData.to)}</div>
        <div className="right">send to</div>
      </div>
      <Table>
        {requireData.cex && (
          <Col>
            <Row isTitle>CEX</Row>
            <Row>
              <LogoWithText
                logo={requireData.cex.logo}
                text={requireData.cex.name}
              />
              {(!requireData.cex.isDeposit ||
                !requireData.cex.supportToken) && (
                <ul className="desc-list">
                  {!requireData.cex.isDeposit && (
                    <li>
                      Non top up address
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
                  {!requireData.cex.supportToken && (
                    <li>
                      {ellipsisTokenSymbol(actionData.token.symbol)} not
                      supported
                      {engineResultMap['1020'] && (
                        <SecurityLevelTagNoText
                          level={
                            processedRules.includes('1020')
                              ? 'proceed'
                              : engineResultMap['1020'].level
                          }
                          onClick={() => handleClickRule('1020')}
                        />
                      )}
                    </li>
                  )}
                </ul>
              )}
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Type</Row>
          <Row>
            {receiverType}
            {contractOnCurrentChain && (
              <ul className="desc-list">
                {contractOnCurrentChain.multisig && <li>MultiSig: Safe</li>}
                {requireData.name && <li>{requireData.name}</li>}
              </ul>
            )}
            {engineResultMap['1019'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1019')
                    ? 'proceed'
                    : engineResultMap['1019'].level
                }
                onClick={() => handleClickRule('1019')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>
            {requireData.contract ? 'Deployed' : 'First on-chain'}
          </Row>
          <Row>{timeSpan}</Row>
        </Col>
        <Col>
          <Row isTitle>Balance</Row>
          <Row>{formatUsdValue(requireData.usd_value)}</Row>
        </Col>
        <Col>
          <Row isTitle>Transacted before</Row>
          <Row>
            <Values.Boolean value={requireData.hasTransfer} />
            {engineResultMap['1018'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1018')
                    ? 'proceed'
                    : engineResultMap['1018'].level
                }
                onClick={() => handleClickRule('1018')}
              />
            )}
          </Row>
        </Col>
        {transferWhiteEnable && (
          <Col>
            <Row isTitle>Whitelist</Row>
            <Row>
              {transferWhitelist.includes(actionData.to.toLowerCase())
                ? 'On my whitelist'
                : 'Not on my whitelist'}
              {engineResultMap['1033'] && (
                <SecurityLevelTagNoText
                  level={
                    processedRules.includes('1033')
                      ? 'proceed'
                      : engineResultMap['1033'].level
                  }
                  onClick={() => handleClickRule('1033')}
                />
              )}
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <AddressMemo address={actionData.to} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <Values.AddressMark
              onWhitelist={receiverInWhitelist}
              onBlacklist={receiverInBlacklist}
              address={actionData.to}
              onChange={() => dispatch.securityEngine.init()}
            />
            {engineResultMap['1031'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1031')
                    ? 'proceed'
                    : engineResultMap['1031'].level
                }
                onClick={() => handleClickRule('1031')}
              />
            )}
            {engineResultMap['1032'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1032')
                    ? 'proceed'
                    : engineResultMap['1032'].level
                }
                onClick={() => handleClickRule('1032')}
              />
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default Send;
