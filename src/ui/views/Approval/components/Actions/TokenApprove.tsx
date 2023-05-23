import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ApproveTokenRequireData, ParsedActionData } from './utils';
import { ellipsis } from 'ui/utils/address';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import userDataDrawer from './components/UserListDrawer';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import IconEdit from 'ui/assets/editpen.svg';

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

const Send = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['approveToken'];
  requireData: ApproveTokenRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { userData, rules, processedRules } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const spenderInWhitelist = useMemo(() => {
    return !!userData.contractWhitelist.find((contract) => {
      return (
        isSameAddress(contract.address, actionData.spender) &&
        contract.chainId === chain.serverId
      );
    });
  }, [userData, requireData, chain]);
  const spenderInBlacklist = useMemo(() => {
    return !!userData.contractBlacklist.find((contract) => {
      return isSameAddress(contract.address, actionData.spender);
    });
  }, [userData, requireData, chain]);

  const timeSpan = useMemo(() => {
    const bornAt = requireData.bornAt;

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

  const handleEditSpenderMark = () => {
    userDataDrawer({
      address: actionData.spender,
      onWhitelist: spenderInWhitelist,
      onBlacklist: spenderInBlacklist,
      async onChange({ onWhitelist, onBlacklist }) {
        const contract = {
          address: actionData.spender,
          chainId: chain.serverId,
        };
        if (onWhitelist && !spenderInWhitelist) {
          await wallet.addContractWhitelist(contract);
        }
        if (onBlacklist && !spenderInBlacklist) {
          await wallet.addContractBlacklist(contract);
        }
        if (
          !onBlacklist &&
          !onWhitelist &&
          (spenderInBlacklist || spenderInWhitelist)
        ) {
          await wallet.removeContractBlacklist(contract);
          await wallet.removeContractWhitelist(contract);
        }
        dispatch.securityEngine.init();
      },
    });
  };

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Approve Token</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={ellipsisTokenSymbol(actionData.token.symbol)}
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle>Approve Amount</Row>
          <Row>
            <Values.TokenAmount value={actionData.token.amount} />
          </Row>
        </Col>
      </Table>
      <div className="header">
        <div className="left">{ellipsis(actionData.spender)}</div>
        <div className="right">approve to</div>
      </div>
      <Table>
        <Col>
          <Row isTitle>Type</Row>
          <Row>
            {requireData.isEOA ? 'EOA' : 'Contract'}
            {engineResultMap['1022'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1022')
                    ? 'proceed'
                    : engineResultMap['1022'].level
                }
                onClick={() => handleClickRule('1022')}
              />
            )}
            {engineResultMap['1029'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1029')
                    ? 'proceed'
                    : engineResultMap['1029'].level
                }
                onClick={() => handleClickRule('1029')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>{requireData.isEOA ? 'First on-chain' : 'Deployed'}</Row>
          <Row>
            {timeSpan}
            {engineResultMap['1024'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1024')
                    ? 'proceed'
                    : engineResultMap['1024'].level
                }
                onClick={() => handleClickRule('1024')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Risk exposure</Row>
          <Row>
            <Values.USDValue value={requireData.riskExposure} />
            {engineResultMap['1023'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1023')
                    ? 'proceed'
                    : engineResultMap['1023'].level
                }
                onClick={() => handleClickRule('1023')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Popularity</Row>
          <Row>
            {requireData.rank ? `No.${requireData.rank} on ${chain.name}` : '-'}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Interacted before</Row>
          <Row>
            <Values.Boolean value={requireData.hasInteraction} />
            {engineResultMap['1025'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1025')
                    ? 'proceed'
                    : engineResultMap['1025'].level
                }
                onClick={() => handleClickRule('1025')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <AddressMemo address={actionData.spender} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <div className="flex">
              <span className="mr-6">
                {spenderInWhitelist && 'Trusted'}
                {spenderInBlacklist && 'Blocked'}
                {!spenderInBlacklist && !spenderInWhitelist && 'No mark'}
              </span>
              <img
                src={IconEdit}
                className="icon-edit-alias icon"
                onClick={handleEditSpenderMark}
              />
            </div>
            {engineResultMap['1026'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1026')
                    ? 'proceed'
                    : engineResultMap['1026'].level
                }
                onClick={() => handleClickRule('1026')}
              />
            )}
            {engineResultMap['1027'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1027')
                    ? 'proceed'
                    : engineResultMap['1027'].level
                }
                onClick={() => handleClickRule('1027')}
              />
            )}
            {engineResultMap['1028'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1028')
                    ? 'proceed'
                    : engineResultMap['1028'].level
                }
                onClick={() => handleClickRule('1028')}
              />
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default Send;
