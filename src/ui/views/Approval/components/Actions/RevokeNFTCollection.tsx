import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ApproveNFTRequireData, ParsedActionData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import * as Values from './components/Values';

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
  engineResults,
}: {
  data: ParsedActionData['approveNFTCollection'];
  requireData: ApproveNFTRequireData;
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
          <Row isTitle>Revoke collection</Row>
          <Row>
            {actionData?.collection?.name}
            <ul className="desc-list">
              <li>
                <div className="whitespace-nowrap overflow-hidden overflow-ellipsis">
                  {actionData?.collection?.name}
                </div>
              </li>
              <li>
                Floor price{' '}
                {actionData?.collection?.floor_price ? (
                  <>
                    {formatAmount(actionData?.collection?.floor_price)}
                    ETH
                  </>
                ) : (
                  '-'
                )}
              </li>
              <li>
                <Values.Address
                  address={actionData.collection.id}
                  chain={chain}
                />
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
      <div className="header">
        <div className="left">
          <Values.Address
            address={actionData.spender}
            chain={chain}
            iconWidth="16px"
          />
        </div>
        <div className="right">revoke from</div>
      </div>
      <Table>
        <Col>
          <Row isTitle>Protocol</Row>
          <Row>
            <Values.Protocol value={requireData.protocol} />
          </Row>
        </Col>
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
            <Values.TimeSpan value={requireData.bornAt} />
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
        {requireData.riskExposure !== null && (
          <Col>
            <Row
              isTitle
              tip="The USD value of the top NFT that has approved to this spender address"
            >
              Risk exposure
            </Row>
            <Row>
              {formatUsdValue(requireData.riskExposure)}
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
        )}
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
            <Values.AddressMark
              address={actionData.spender}
              chain={chain}
              onWhitelist={spenderInWhitelist}
              onBlacklist={spenderInBlacklist}
              onChange={() => dispatch.securityEngine.init()}
              isContract
            />
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

export default RevokeNFTCollection;
