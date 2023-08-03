import React, { useMemo, useEffect } from 'react';
import { BigNumber } from 'bignumber.js';
import styled from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { ParsedActionData, SwapRequireData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsisTokenSymbol, getTokenSymbol } from 'ui/utils/token';
import { Chain } from 'background/service/openapi';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { isSameAddress } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { SecurityListItem } from './components/SecurityListItem';
import { ProtocolListItem } from './components/ProtocolListItem';

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
    balanceChange,
  } = data!;

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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Pay</Row>
          <Row>
            <LogoWithText
              logo={payToken.logo_url}
              text={`${formatAmount(payToken.amount)} ${ellipsisTokenSymbol(
                getTokenSymbol(payToken)
              )}`}
              logoRadius="100%"
            />
            <ul className="desc-list">
              <li>
                ≈
                {formatUsdValue(
                  new BigNumber(payToken.amount).times(payToken.price).toFixed()
                )}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Receive</Row>
          <Row>
            <div className="flex relative pr-10">
              <LogoWithText
                logo={receiveToken.logo_url}
                logoRadius="100%"
                text={
                  balanceChange.success && balanceChange.support
                    ? `${formatAmount(
                        receiveToken.amount
                      )} ${ellipsisTokenSymbol(getTokenSymbol(receiveToken))}`
                    : 'Fail to load'
                }
                icon={
                  <Values.TokenLabel
                    isFake={receiveToken.is_verified === false}
                    isScam={
                      receiveToken.is_verified !== false &&
                      !!receiveToken.is_suspicious
                    }
                  />
                }
              />
              {engineResultMap['1008'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1008'].enable}
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
                  enable={engineResultMap['1009'].enable}
                  level={
                    processedRules.includes('1009')
                      ? 'proceed'
                      : engineResultMap['1009'].level
                  }
                  onClick={() => handleClickRule('1009')}
                />
              )}
            </div>
            <ul className="desc-list">
              {balanceChange.success && balanceChange.support && (
                <>
                  <li>
                    ≈
                    {formatUsdValue(
                      new BigNumber(receiveToken.amount)
                        .times(receiveToken.price)
                        .toFixed()
                    )}
                  </li>
                  <SecurityListItem
                    engineResult={engineResultMap['1012']}
                    id="1012"
                    dangerText={
                      <>
                        Value diff{' '}
                        <Values.Percentage value={usdValuePercentage!} /> (
                        {formatUsdValue(usdValueDiff || '')})
                      </>
                    }
                    warningText={
                      <>
                        Value diff{' '}
                        <Values.Percentage value={usdValuePercentage!} /> (
                        {formatUsdValue(usdValueDiff || '')})
                      </>
                    }
                  />
                </>
              )}
              {balanceChange.support && !balanceChange.success && (
                <li>Transaction simulation failed</li>
              )}
              {!balanceChange.support && (
                <li>Transaction simulation not supported on this chain</li>
              )}
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Minimum Receive</Row>
          <Row>
            <div>
              <LogoWithText
                logo={minReceive.logo_url}
                logoRadius="100%"
                text={`${formatAmount(minReceive.amount)} ${ellipsisTokenSymbol(
                  getTokenSymbol(minReceive)
                )}`}
              />
            </div>
            <ul className="desc-list">
              <li>
                ≈
                {formatUsdValue(
                  new BigNumber(minReceive.amount)
                    .times(minReceive.price)
                    .toFixed()
                )}
              </li>
              <li>
                {slippageTolerance === null &&
                  'Slippage tolerance fail to load'}
                {slippageTolerance !== null && (
                  <>
                    Slippage tolerance{' '}
                    {hasReceiver ? (
                      '-'
                    ) : (
                      <Values.Percentage value={slippageTolerance} />
                    )}
                  </>
                )}
                {engineResultMap['1011'] && (
                  <SecurityLevelTagNoText
                    enable={engineResultMap['1011'].enable}
                    level={
                      processedRules.includes('1011')
                        ? 'proceed'
                        : engineResultMap['1011'].level
                    }
                    onClick={() => handleClickRule('1011')}
                  />
                )}
              </li>
            </ul>
          </Row>
        </Col>
        {engineResultMap['1069'] && (
          <Col>
            <Row isTitle>Receiver</Row>
            <Row>
              <Values.Address address={receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  engineResult={engineResultMap['1069']}
                  id="1069"
                  dangerText="Not the payment address"
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
              <ProtocolListItem protocol={requireData.protocol} />
              <li>
                <Values.Interacted value={requireData.hasInteraction} />
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

export default Swap;
