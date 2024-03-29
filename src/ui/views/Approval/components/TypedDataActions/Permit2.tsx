import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
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

const Permit2 = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: TypedDataActionData['permit2'];
  requireData: ApproveTokenRequireData;
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

  const tokenBalance = useMemo(() => {
    return new BigNumber(requireData.token.raw_amount || '0')
      .div(10 ** requireData.token.decimals)
      .toFixed();
  }, [requireData]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.tokenApprove.approveToken')}</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={
                <div className="overflow-hidden overflow-ellipsis flex">
                  <Values.TokenAmount value={actionData.token.amount} />
                  <span className="ml-2">
                    <Values.TokenSymbol token={actionData.token} />
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
                <Values.TokenAmount value={tokenBalance} />
                <span>
                  {ellipsisTokenSymbol(getTokenSymbol(actionData.token))}
                </span>
              </li>
            </ul>
          </Row>
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
                id="1071"
                engineResult={engineResultMap['1071']}
                dangerText="EOA address"
              />

              <SecurityListItem
                id="1074"
                engineResult={engineResultMap['1074']}
                warningText={<Values.Interacted value={false} />}
                defaultText={
                  <Values.Interacted value={requireData.hasInteraction} />
                }
              />

              <SecurityListItem
                id="1072"
                engineResult={engineResultMap['1072']}
                dangerText={t('page.signTx.tokenApprove.trustValueLessThan', {
                  value: '$10,000',
                })}
                warningText={t('page.signTx.tokenApprove.trustValueLessThan', {
                  value: '$100,000',
                })}
              />

              <SecurityListItem
                id="1073"
                engineResult={engineResultMap['1073']}
                warningText={t('page.signTx.tokenApprove.deployTimeLessThan', {
                  value: '3',
                })}
              />

              <SecurityListItem
                id="1075"
                engineResult={engineResultMap['1075']}
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
