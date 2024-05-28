import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.tokenApprove.approveToken')}</Row>
          <div className="flex-1 overflow-hidden">
            {actionData.token_list.map((token) => (
              <Row key={token.id} className="has-bottom-border">
                <LogoWithText
                  logo={token.logo_url}
                  text={
                    <div className="overflow-hidden overflow-ellipsis flex">
                      <Values.TokenAmount value={token.amount} />
                      <span className="ml-2">
                        <Values.TokenSymbol token={token} />
                      </span>
                    </div>
                  }
                  logoRadius="100%"
                />
                <ul className="desc-list">
                  <li className="flex gap-x-4">
                    <span className="whitespace-nowrap">
                      {t('page.signTx.tokenApprove.myBalance')}
                    </span>
                    <Values.TokenAmount value={tokenBalanceMap[token.id]} />
                    <span>{ellipsisTokenSymbol(getTokenSymbol(token))}</span>
                  </li>
                </ul>
              </Row>
            ))}
          </div>
        </Col>
        <Col>
          <Row isTitle tip={t('page.signTypedData.permit2.sigExpireTimeTip')}>
            {t('page.signTypedData.permit2.sigExpireTime')}
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
          <Row isTitle>
            {t('page.signTypedData.permit2.approvalExpiretime')}
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
          <Row isTitle>{t('page.signTx.tokenApprove.approveTo')}</Row>
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
                defaultText={
                  <Values.Interacted value={requireData.hasInteraction} />
                }
              />

              <SecurityListItem
                id="1110"
                engineResult={engineResultMap['1110']}
                dangerText={t('page.signTx.tokenApprove.trustValueLessThan', {
                  value: '$10,000',
                })}
                warningText={t('page.signTx.tokenApprove.trustValueLessThan', {
                  value: '$100,000',
                })}
              />

              <SecurityListItem
                id="1111"
                engineResult={engineResultMap['1111']}
                warningText={t('page.signTx.tokenApprove.deployTimeLessThan', {
                  value: '3',
                })}
              />

              <SecurityListItem
                id="1113"
                engineResult={engineResultMap['1113']}
                dangerText={t('page.signTx.tokenApprove.flagByRabby')}
              />

              <SecurityListItem
                id="1134"
                engineResult={engineResultMap['1134']}
                forbiddenText={t('page.signTx.markAsBlock')}
              />

              <SecurityListItem
                id="1136"
                engineResult={engineResultMap['1136']}
                warningText={t('page.signTx.markAsBlock')}
              />

              <SecurityListItem
                id="1133"
                engineResult={engineResultMap['1133']}
                safeText={t('page.signTx.markAsTrust')}
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
