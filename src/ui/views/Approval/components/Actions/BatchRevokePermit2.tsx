import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
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
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.revokeTokenApprove.revokeToken')}</Row>
          <Row>
            <div className="flex gap-y-12 flex-col">
              {actionData.revoke_list.map((item) => (
                <LogoWithText
                  logo={item.token.logo_url}
                  text={<Values.TokenSymbol token={item.token} />}
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
                spender: actionData.revoke_list[0].spender,
                chain,
                isRevoke: true,
              }}
            >
              <Values.Address
                id="revoke-permit2-address"
                hasHover
                address={actionData.revoke_list[0].spender}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>

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
