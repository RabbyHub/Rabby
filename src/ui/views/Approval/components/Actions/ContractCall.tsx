import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ContractCallRequireData, ParsedActionData } from './utils';
import { ellipsis } from 'ui/utils/address';
import { isSameAddress } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import IconAlert from 'ui/assets/sign/tx/alert.svg';

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
  engineResults,
}: {
  data: ParsedActionData['contractCall'];
  requireData: ContractCallRequireData;
  chain: Chain;
  raw: Record<string, string | number>;
  engineResults: Result[];
  onChange(tx: Record<string, any>): void;
}) => {
  const dispatch = useRabbyDispatch();
  const { userData, rules, processedRules } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const contractInWhitelist = useMemo(() => {
    return !!userData.contractWhitelist.find((contract) => {
      return (
        isSameAddress(contract.address, requireData.call.contract.id) &&
        contract.chainId === chain.serverId
      );
    });
  }, [userData, requireData, chain]);
  const contractInBlacklist = useMemo(() => {
    return !!userData.contractBlacklist.find((contract) => {
      return isSameAddress(contract.address, requireData.call.contract.id);
    });
  }, [userData, requireData, chain]);

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
      <div className="contract-call-header">
        <div className="alert">
          <img className="icon icon-alert" src={IconAlert} />
          This signature can't be decoded by Rabby, but it doesn't imply any
          risk
        </div>
        <div className="text-12 font-medium text-gray-common">
          {requireData.call.func
            ? 'Here are the decoded results from ABI:'
            : "Here is the contract info you'll interact with:"}
        </div>
      </div>
      <div className="header">
        <div className="left">{ellipsis(requireData.call.contract.id)}</div>
        <div className="right">interact with</div>
      </div>
      <Table>
        {requireData.call.func && (
          <Col>
            <Row isTitle>Operation</Row>
            <Row>{requireData.call.func}</Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Protocol</Row>
          <Row>
            {requireData.protocol ? (
              <LogoWithText
                logo={requireData.protocol.logo_url}
                text={requireData.protocol.name}
                logoRadius="100%"
              />
            ) : (
              '-'
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Type</Row>
          <Row>Contract</Row>
        </Col>
        <Col>
          <Row isTitle>Deployed</Row>
          <Row>
            <Values.TimeSpan value={requireData.bornAt} />
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
            {/* {engineResultMap['1025'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1025')
                    ? 'proceed'
                    : engineResultMap['1025'].level
                }
                onClick={() => handleClickRule('1025')}
              />
            )} */}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <AddressMemo address={requireData.call.contract.id} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <Values.AddressMark
              onBlacklist={contractInBlacklist}
              onWhitelist={contractInWhitelist}
              address={requireData.call.contract.id}
              chainId={chain.serverId}
              isContract
              onChange={() => dispatch.securityEngine.init()}
            />
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default ContractCall;
