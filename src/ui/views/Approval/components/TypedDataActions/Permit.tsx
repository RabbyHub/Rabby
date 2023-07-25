import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ApproveTokenRequireData, TypedDataActionData } from './utils';
import { ellipsisTokenSymbol, getTokenSymbol } from 'ui/utils/token';
import { formatAmount } from '@/ui/utils/number';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import LogoWithText from '../Actions/components/LogoWithText';
import * as Values from '../Actions/components/Values';
import ViewMore from '../Actions/components/ViewMore';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';

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
  data: TypedDataActionData['permit'];
  requireData: ApproveTokenRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const tokenBalance = useMemo(() => {
    console.log(requireData);
    return new BigNumber(requireData.token.raw_amount || '0')
      .div(10 ** requireData.token.decimals)
      .toFixed();
  }, [requireData]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Approve token</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={
                <div className="overflow-hidden overflow-ellipsis flex">
                  <Values.TokenAmount value={actionData.token.amount} />
                  <span className="mr-2">
                    {ellipsisTokenSymbol(getTokenSymbol(actionData.token))}
                  </span>
                </div>
              }
              logoRadius="100%"
            />
            <ul className="desc-list">
              <li>
                My balance <span>{formatAmount(tokenBalance)}</span>{' '}
                {ellipsisTokenSymbol(getTokenSymbol(actionData.token))}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row
            isTitle
            tip="The duration for this signature to be valid on-chain"
          >
            Signature expire time
          </Row>
          <Row>
            {actionData.expire_at ? (
              <Values.TimeSpanFuture to={actionData.expire_at} />
            ) : (
              '-'
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Approve to</Row>
          <Row>
            <div>
              <Values.Address address={actionData.spender} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />

              <SecurityListItem
                id="1077"
                engineResult={engineResultMap['1077']}
                dangerText="EOA address"
              />

              <SecurityListItem
                id="1080"
                engineResult={engineResultMap['1080']}
                warningText={<Values.Interacted value={false} />}
                defaultText={
                  <Values.Interacted value={requireData.hasInteraction} />
                }
              />

              <SecurityListItem
                id="1078"
                engineResult={engineResultMap['1078']}
                dangerText="Trust value ≤ $10,000"
                warningText="Trust value ≤ $100,000"
              />

              <SecurityListItem
                id="1079"
                engineResult={engineResultMap['1079']}
                warningText="Deployed time < 3 days"
              />

              <SecurityListItem
                id="1106"
                engineResult={engineResultMap['1106']}
                dangerText="Flagged by Rabby"
              />

              <li>
                <ViewMore
                  type="spender"
                  data={{
                    ...requireData,
                    spender: actionData.spender,
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
