import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import styled from 'styled-components';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import { ParsedActionData, SwapRequireData } from './utils';
import { formatTokenAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsis } from 'ui/utils/address';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { Chain } from 'background/service/openapi';
import IconRank from 'ui/assets/sign/contract/rank.svg';
import { Result } from '@debank/rabby-security-engine';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { isSameAddress, useAlias } from '@/ui/utils';
import IconEdit from 'ui/assets/editpen.svg';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
  }
  .icon-edit-alias {
    margin-left: 8px;
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

  const [receiverAlias, updateReceiverAlias] = useAlias(receiver);
  const [contractAlias, updateContractAlias] = useAlias(requireData.id);

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const hasReceiver = useMemo(() => {
    return isSameAddress(receiver, requireData.sender);
  }, [requireData, receiver]);

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

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Pay Token</Row>
          <Row>
            <LogoWithText
              logo={payToken.logo_url}
              text={`${formatTokenAmount(
                payToken.amount
              )} ${ellipsisTokenSymbol(payToken.symbol)}`}
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
            <LogoWithText
              logo={receiveToken.logo_url}
              text={`${formatTokenAmount(
                receiveToken.amount
              )} ${ellipsisTokenSymbol(receiveToken.symbol)}`}
            />
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
                Value diff {(usdValuePercentage * 100).toFixed(2)}%(
                {formatUsdValue(usdValueDiff)})
                {engineResultMap['1012'] && (
                  <SecurityLevelTagNoText
                    level={engineResultMap['1012'].level}
                  />
                )}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Minimum Received</Row>
          <Row>
            <div>{`${formatTokenAmount(
              minReceive.amount
            )} ${ellipsisTokenSymbol(minReceive.symbol)}`}</div>
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
            <div>{(slippageTolerance * 100).toFixed(2)}%</div>
            {engineResultMap['1011'] && (
              <SecurityLevelTagNoText level={engineResultMap['1011'].level} />
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
                      level={engineResultMap['1010'].level}
                    />
                  )}
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
                <img src={IconRank} className="icon icon-rank" />
                {requireData.rank} on {chain.name}
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
            {contractAlias || '-'}
            <img src={IconEdit} className="icon-edit-alias icon" />
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default Swap;
