import React, { useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { Result } from '@debank/rabby-security-engine';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import AddressMemo from './components/AddressMemo';
import * as Values from './components/Values';
import { ParsedActionData, WrapTokenRequireData } from './utils';
import { formatAmount } from 'ui/utils/number';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { Chain } from 'background/service/openapi';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { isSameAddress } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

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
  const { payToken, receiveToken } = data!;

  const { userData, rules, processedRules } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
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

  const contractInWhitelist = useMemo(() => {
    return !!userData.contractWhitelist.find((contract) => {
      return (
        isSameAddress(contract.address, requireData.id) &&
        contract.chainId === chain.serverId
      );
    });
  }, [userData, requireData, chain]);
  const contractInBlacklist = useMemo(() => {
    return !!userData.contractBlacklist.find((contract) => {
      return isSameAddress(contract.address, requireData.id);
    });
  }, [userData, requireData, chain]);

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
          </Row>
        </Col>
      </Table>
      <div className="header">
        <div className="left">
          <Values.Address
            address={requireData.id}
            chain={chain}
            iconWidth="16px"
          />
        </div>
        <div className="right">contract</div>
      </div>
      <Table>
        {requireData.protocol && (
          <Col>
            <Row isTitle>Protocol</Row>
            <Row>
              <LogoWithText
                logo={requireData.protocol.logo_url}
                text={requireData.protocol.name}
                logoRadius="100%"
              />
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Deployed</Row>
          <Row>
            <Values.TimeSpan value={requireData.bornAt} />
          </Row>
        </Col>
        {requireData.rank && (
          <Col>
            <Row isTitle>Popularity</Row>
            <Row>
              <div className="flex">
                No.{requireData.rank} on {chain.name}
              </div>
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Interacted before</Row>
          <Row>{requireData.hasInteraction ? 'Yes' : 'No'}</Row>
        </Col>
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <AddressMemo address={requireData.id} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <Values.AddressMark
              onWhitelist={contractInWhitelist}
              onBlacklist={contractInBlacklist}
              address={requireData.id}
              chain={chain}
              isContract
              onChange={() => dispatch.securityEngine.init()}
            />
            {engineResultMap['1014'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1014')
                    ? 'proceed'
                    : engineResultMap['1014'].level
                }
                onClick={() => handleClickRule('1014')}
              />
            )}
            {engineResultMap['1015'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1015')
                    ? 'proceed'
                    : engineResultMap['1015'].level
                }
                onClick={() => handleClickRule('1015')}
              />
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default WrapToken;
