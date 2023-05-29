import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ApproveNFTRequireData, ParsedActionData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { getTimeSpan } from 'ui/utils/time';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import NFTWithName from './components/NFTWithName';
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

const ApproveNFT = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['approveNFT'];
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

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Approve NFT</Row>
          <Row>
            <NFTWithName nft={actionData?.nft}></NFTWithName>
            <ul className="desc-list">
              <li>
                <div className="whitespace-nowrap overflow-hidden overflow-ellipsis">
                  {actionData?.nft?.collection?.name}
                </div>
              </li>
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
      </Table>
      <div className="header">
        <div className="left">
          <Values.Address
            address={actionData.spender}
            chain={chain}
            iconWidth="16px"
          />
        </div>
        <div className="right">approve to</div>
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
            {engineResultMap['1043'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1043')
                    ? 'proceed'
                    : engineResultMap['1043'].level
                }
                onClick={() => handleClickRule('1043')}
              />
            )}
            {engineResultMap['1052'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1052')
                    ? 'proceed'
                    : engineResultMap['1052'].level
                }
                onClick={() => handleClickRule('1052')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>{requireData.isEOA ? 'First on-chain' : 'Deployed'}</Row>
          <Row>
            {timeSpan}
            {engineResultMap['1045'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1045')
                    ? 'proceed'
                    : engineResultMap['1045'].level
                }
                onClick={() => handleClickRule('1045')}
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
              {formatUsdValue(requireData.riskExposure || 0)}
              {engineResultMap['1044'] && (
                <SecurityLevelTagNoText
                  level={
                    processedRules.includes('1044')
                      ? 'proceed'
                      : engineResultMap['1044'].level
                  }
                  onClick={() => handleClickRule('1044')}
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
            {engineResultMap['1048'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1048')
                    ? 'proceed'
                    : engineResultMap['1048'].level
                }
                onClick={() => handleClickRule('1048')}
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
            {engineResultMap['1049'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1049')
                    ? 'proceed'
                    : engineResultMap['1049'].level
                }
                onClick={() => handleClickRule('1049')}
              />
            )}
            {engineResultMap['1050'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1050')
                    ? 'proceed'
                    : engineResultMap['1050'].level
                }
                onClick={() => handleClickRule('1050')}
              />
            )}
            {engineResultMap['1051'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1051')
                    ? 'proceed'
                    : engineResultMap['1051'].level
                }
                onClick={() => handleClickRule('1051')}
              />
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default ApproveNFT;
