import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ApproveNFTRequireData, ParsedActionData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsis } from 'ui/utils/address';
import { getTimeSpan } from 'ui/utils/time';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import userDataDrawer from './components/UserListDrawer';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import IconEdit from 'ui/assets/editpen.svg';
import { NameAndAddress } from '@/ui/component';
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

const ApproveNFTCollection = ({
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
          <Row isTitle>Approve collection</Row>
          <Row>
            {actionData?.collection?.name}
            <ul className="desc-list">
              <li>{actionData?.collection?.name}</li>
              <li>
                Floor price{' '}
                {actionData?.collection?.floor_price ? (
                  <>
                    {formatAmount(actionData?.collection?.floor_price)}
                    {chain.nativeTokenSymbol}
                  </>
                ) : (
                  '-'
                )}
              </li>
              <li>
                <NameAndAddress
                  address={actionData?.collection?.id}
                  chainEnum={chain?.enum}
                  openExternal
                />
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
      <div className="header">
        <div className="left">{ellipsis(actionData.spender)}</div>
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
            {engineResultMap['1053'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1053')
                    ? 'proceed'
                    : engineResultMap['1053'].level
                }
                onClick={() => handleClickRule('1053')}
              />
            )}
            {engineResultMap['1060'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1060')
                    ? 'proceed'
                    : engineResultMap['1060'].level
                }
                onClick={() => handleClickRule('1060')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>{requireData.isEOA ? 'First on-chain' : 'Deployed'}</Row>
          <Row>
            {timeSpan}
            {engineResultMap['1055'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1055')
                    ? 'proceed'
                    : engineResultMap['1055'].level
                }
                onClick={() => handleClickRule('1055')}
              />
            )}
          </Row>
        </Col>
        {requireData.riskExposure !== null && (
          <Col>
            <Row isTitle>Risk exposure</Row>
            <Row>
              {formatUsdValue(requireData.riskExposure)}
              {engineResultMap['1054'] && (
                <SecurityLevelTagNoText
                  level={
                    processedRules.includes('1054')
                      ? 'proceed'
                      : engineResultMap['1054'].level
                  }
                  onClick={() => handleClickRule('1054')}
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
            {engineResultMap['1056'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1056')
                    ? 'proceed'
                    : engineResultMap['1056'].level
                }
                onClick={() => handleClickRule('1056')}
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
            {engineResultMap['1057'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1057')
                    ? 'proceed'
                    : engineResultMap['1057'].level
                }
                onClick={() => handleClickRule('1057')}
              />
            )}
            {engineResultMap['1058'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1058')
                    ? 'proceed'
                    : engineResultMap['1058'].level
                }
                onClick={() => handleClickRule('1058')}
              />
            )}
            {engineResultMap['1059'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1059')
                    ? 'proceed'
                    : engineResultMap['1059'].level
                }
                onClick={() => handleClickRule('1059')}
              />
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default ApproveNFTCollection;
