import React, { useMemo, useEffect } from 'react';
import { BigNumber } from 'bignumber.js';
import styled from 'styled-components';
import { Result } from '@debank/rabby-security-engine';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import AddressMemo from './components/AddressMemo';
import * as Values from './components/Values';
import { ParsedActionData, SwapRequireData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsis } from 'ui/utils/address';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { Chain } from 'background/service/openapi';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import IconFakeToken from 'ui/assets/sign/tx/token-fake.svg';
import IconScamToken from 'ui/assets/sign/tx/token-scam.svg';

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

const Swap = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['swap'];
  requireData: SwapRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const {
    payToken,
    receiveToken,
    slippageTolerance,
    usdValueDiff,
    usdValuePercentage,
    minReceive,
    receiver,
  } = data!;

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

  const receiverInWhitelist = useMemo(() => {
    return userData.addressWhitelist.includes(receiver.toLowerCase());
  }, [userData, receiver]);
  const receiverInBlacklist = useMemo(() => {
    return userData.addressBlacklist.includes(receiver.toLowerCase());
  }, [userData, receiver]);

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

  const hasReceiver = useMemo(() => {
    return !isSameAddress(receiver, requireData.sender);
  }, [requireData, receiver]);

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

  const timeSpan = useMemo(() => {
    const { d, h, m } = getTimeSpan(
      Math.floor(Date.now() / 1000) - requireData.bornAt
    );
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

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Pay Token</Row>
          <Row>
            <LogoWithText
              logo={payToken.logo_url}
              text={`${formatAmount(payToken.amount)} ${ellipsisTokenSymbol(
                payToken.symbol
              )}`}
            />
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(payToken.amount).times(payToken.price).toFixed()
                )}
                @{formatUsdValue(payToken.price)}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Receive Token</Row>
          <Row>
            <div className="flex">
              <LogoWithText
                logo={receiveToken.logo_url}
                text={`${formatAmount(
                  receiveToken.amount
                )} ${ellipsisTokenSymbol(receiveToken.symbol)}`}
              />
              {!receiveToken.is_verified && (
                <img className="icon icon-fake-token" src={IconFakeToken} />
              )}
              {requireData.receiveTokenIsScam && (
                <img className="icon icon-scam-token" src={IconScamToken} />
              )}
            </div>
            {engineResultMap['1008'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1008')
                    ? 'proceed'
                    : engineResultMap['1008'].level
                }
                onClick={() => handleClickRule('1008')}
              />
            )}
            {engineResultMap['1009'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1009')
                    ? 'proceed'
                    : engineResultMap['1009'].level
                }
                onClick={() => handleClickRule('1009')}
              />
            )}
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(receiveToken.amount)
                    .times(receiveToken.price)
                    .toFixed()
                )}
                @{formatUsdValue(receiveToken.price)}
              </li>
              <li>
                Value diff <Values.Percentage value={usdValuePercentage} />(
                {formatUsdValue(usdValueDiff)})
                {engineResultMap['1012'] && (
                  <SecurityLevelTagNoText
                    level={
                      processedRules.includes('1012')
                        ? 'proceed'
                        : engineResultMap['1012'].level
                    }
                    onClick={() => handleClickRule('1012')}
                  />
                )}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Minimum Received</Row>
          <Row>
            <div>{`${formatAmount(minReceive.amount)} ${ellipsisTokenSymbol(
              minReceive.symbol
            )}`}</div>
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(minReceive.amount)
                    .times(minReceive.price)
                    .toFixed()
                )}
                @{formatUsdValue(minReceive.price)}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Slippage tolerance</Row>
          <Row>
            <div>
              <Values.Percentage value={slippageTolerance} />
            </div>
            {engineResultMap['1011'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1011')
                    ? 'proceed'
                    : engineResultMap['1011'].level
                }
                onClick={() => handleClickRule('1011')}
              />
            )}
          </Row>
        </Col>
        {hasReceiver && (
          <Col>
            <Row isTitle>Receiver</Row>
            <Row>
              {ellipsis(receiver)}
              <ul className="desc-list">
                <li>
                  not your current address{' '}
                  {engineResultMap['1010'] && (
                    <SecurityLevelTagNoText
                      level={
                        processedRules.includes('1010')
                          ? 'proceed'
                          : engineResultMap['1010'].level
                      }
                      onClick={() => handleClickRule('1010')}
                    />
                  )}
                </li>
                <li className="flex">
                  <AddressMemo address={receiver} />
                </li>
                <li>
                  <Values.AddressMark
                    onWhitelist={receiverInWhitelist}
                    onBlacklist={receiverInBlacklist}
                    address={receiver}
                    onChange={() => dispatch.securityEngine.init()}
                  />
                </li>
              </ul>
            </Row>
          </Col>
        )}
      </Table>
      <div className="header">
        <div className="left">{ellipsis(requireData.id)}</div>
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
              />
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Deployed</Row>
          <Row>{timeSpan}</Row>
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
              chainId={chain.serverId}
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

export default Swap;
