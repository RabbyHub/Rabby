import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { SwapTokenOrderRequireData, TypedDataActionData } from './utils';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { isSameAddress } from '@/ui/utils';
import { formatAmount, formatUsdValue } from '@/ui/utils/number';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import LogoWithText from '../Actions/components/LogoWithText';
import * as Values from '../Actions/components/Values';
import ViewMore from '../Actions/components/ViewMore';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';

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

const Permit = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: TypedDataActionData['swapTokenOrder'];
  requireData: SwapTokenOrderRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const {
    payToken,
    receiveToken,
    usdValueDiff,
    usdValuePercentage,
    receiver,
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
          <Row isTitle>Pay Token</Row>
          <Row>
            <LogoWithText
              logo={payToken.logo_url}
              text={`${formatAmount(payToken.amount)} ${ellipsisTokenSymbol(
                payToken.symbol
              )}`}
              logoRadius="100%"
            />
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(payToken.amount).times(payToken.price).toFixed()
                )}{' '}
                @{formatUsdValue(payToken.price)}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Receive Token</Row>
          <Row>
            <div className="flex relative pr-10">
              <LogoWithText
                logo={receiveToken.logo_url}
                logoRadius="100%"
                text={`${formatAmount(
                  receiveToken.amount
                )} ${ellipsisTokenSymbol(receiveToken.symbol)}`}
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
              {engineResultMap['1090'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1090'].enable}
                  level={
                    processedRules.includes('1090')
                      ? 'proceed'
                      : engineResultMap['1090'].level
                  }
                  onClick={() => handleClickRule('1090')}
                />
              )}
              {engineResultMap['1091'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1091'].enable}
                  level={
                    processedRules.includes('1091')
                      ? 'proceed'
                      : engineResultMap['1091'].level
                  }
                  onClick={() => handleClickRule('1091')}
                />
              )}
            </div>
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(receiveToken.amount)
                    .times(receiveToken.price)
                    .toFixed()
                )}{' '}
                @{formatUsdValue(receiveToken.price)}
              </li>
              <SecurityListItem
                engineResult={engineResultMap['1095']}
                id="1095"
                dangerText={
                  <>
                    Value diff <Values.Percentage value={usdValuePercentage!} />{' '}
                    ({formatUsdValue(usdValueDiff || '')})
                  </>
                }
                warningText={
                  <>
                    Value diff <Values.Percentage value={usdValuePercentage!} />{' '}
                    ({formatUsdValue(usdValueDiff || '')})
                  </>
                }
              />
            </ul>
          </Row>
        </Col>
        {engineResultMap['1094'] && (
          <Col>
            <Row isTitle>Receiver</Row>
            <Row>
              <Values.Address address={receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  engineResult={engineResultMap['1094']}
                  id="1094"
                  dangerText="Not your current address"
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
                {requireData.hasInteraction
                  ? 'Interacted before'
                  : 'Never interacted before'}
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

export default Permit;
