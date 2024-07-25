import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain, RevokeTokenApproveAction } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ParsedActionData, RevokeTokenApproveRequireData } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import { ProtocolListItem } from './components/ProtocolListItem';
import ViewMore from './components/ViewMore';
import { SubTable, SubCol, SubRow } from './components/SubTable';

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

export const BatchRevokePermit2 = ({
  data,
  requireData,
  chain,
}: {
  data: ParsedActionData['permit2BatchRevokeToken'];
  requireData: RevokeTokenApproveRequireData;
  chain: Chain;
  raw?: Record<string, string | number>;
  engineResults: Result[];
  onChange?(tx: Record<string, any>): void;
}) => {
  const actionData = data!;
  const { t } = useTranslation();
  const group = React.useMemo(() => {
    const list: Record<string, RevokeTokenApproveAction['token'][]> = {};
    actionData.revoke_list.forEach((item) => {
      if (!list[item.spender]) {
        list[item.spender] = [];
      }
      list[item.spender].push(item.token);
    });
    return list;
  }, [actionData.revoke_list]);

  return (
    <Wrapper>
      <Table>
        {Object.keys(group).map((spender) => {
          return (
            <>
              <Col>
                <Row isTitle>
                  {t('page.signTx.revokeTokenApprove.revokeToken')}
                </Row>
                <Row>
                  <div className="flex gap-y-12 flex-col">
                    {group[spender].map((token) => (
                      <LogoWithText
                        logo={token.logo_url}
                        text={<Values.TokenSymbol token={token} />}
                        logoRadius="100%"
                      />
                    ))}
                  </div>
                </Row>
              </Col>
              <Col>
                <Row isTitle itemsCenter>
                  {t('page.signTx.revokeTokenApprove.revokeFrom')}
                </Row>
                <Row>
                  <ViewMore
                    type="spender"
                    data={{
                      ...requireData,
                      spender,
                      chain,
                      isRevoke: true,
                    }}
                  >
                    <Values.Address
                      id="revoke-permit2-address"
                      hasHover
                      address={spender}
                      chain={chain}
                    />
                  </ViewMore>
                </Row>
              </Col>
            </>
          );
        })}

        <SubTable target="revoke-permit2-address">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.protocol')}</SubRow>
            <SubRow>
              <ProtocolListItem protocol={requireData.protocol} />
            </SubRow>
          </SubCol>
        </SubTable>
      </Table>
    </Wrapper>
  );
};
