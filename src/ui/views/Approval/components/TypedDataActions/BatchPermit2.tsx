import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { BatchApproveTokenRequireData, TypedDataActionData } from './utils';
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

const Permit2 = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: TypedDataActionData['batchPermit2'];
  requireData: BatchApproveTokenRequireData;
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

  const tokenBalanceMap: Record<string, string> = useMemo(() => {
    return requireData.tokens.reduce((res, token) => {
      return {
        ...res,
        [token.id]: new BigNumber(token.raw_amount || '0')
          .div(10 ** token.decimals)
          .toFixed(),
      };
    }, {});
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
          <div className="flex-1 overflow-hidden">
            {actionData.token_list.map((token) => (
              <Row key={token.id} className="has-bottom-border">
                <LogoWithText
                  logo={token.logo_url}
                  text={
                    <div className="overflow-hidden overflow-ellipsis flex">
                      <Values.TokenAmount value={token.amount} />
                      <span className="ml-2">
                        {ellipsisTokenSymbol(getTokenSymbol(token))}
                      </span>
                    </div>
                  }
                  logoRadius="100%"
                />
                <ul className="desc-list">
                  <li>
                    My balance{' '}
                    <span>{formatAmount(tokenBalanceMap[token.id])}</span>{' '}
                    {ellipsisTokenSymbol(getTokenSymbol(token))}
                  </li>
                </ul>
              </Row>
            ))}
          </div>
        </Col>
        <Col>
          <Row
            isTitle
            tip="The duration for this signature to be valid on-chain"
          >
            Signature expire time
          </Row>
          <Row>
            {actionData.sig_expire_at ? (
              <Values.TimeSpanFuture to={actionData.sig_expire_at} />
            ) : (
              '-'
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Approval expire time</Row>
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
                id="1109"
                engineResult={engineResultMap['1109']}
                dangerText="EOA address"
              />

              <SecurityListItem
                id="1112"
                engineResult={engineResultMap['1112']}
                warningText={<Values.Interacted value={false} />}
                defaultText={<Values.Interacted value />}
              />

              <SecurityListItem
                id="1110"
                engineResult={engineResultMap['1110']}
                dangerText="Trust value ≤ $10,000"
                warningText="Trust value ≤ $100,000"
              />

              <SecurityListItem
                id="1111"
                engineResult={engineResultMap['1111']}
                warningText="Deployed time < 3 days"
              />

              <SecurityListItem
                id="1113"
                engineResult={engineResultMap['1113']}
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

export default Permit2;
