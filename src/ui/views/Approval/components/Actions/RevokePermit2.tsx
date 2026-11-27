import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  ApproveTokenRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import { ProtocolListItem } from './components/ProtocolListItem';
import ViewMore from './components/ViewMore';
import { SubTable, SubCol, SubRow } from './components/SubTable';
import styles from './RevokePermit2.module.css';

const RevokePermit2 = ({
  data,
  requireData,
  chain,
}: {
  data: ParsedTransactionActionData['approveToken'];
  requireData: ApproveTokenRequireData;
  chain: Chain;
  raw?: Record<string, string | number>;
  engineResults: Result[];
  onChange?(tx: Record<string, any>): void;
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  return (
    <div className={styles.wrapper}>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.revokeTokenApprove.revokeToken')}</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={<Values.TokenSymbol token={requireData.token} />}
              logoRadius="100%"
            />
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
                spender: actionData.spender,
                chain,
                isRevoke: true,
              }}
            >
              <Values.Address
                id="revoke-permit2-address"
                hasHover
                address={actionData.spender}
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
    </div>
  );
};

export default RevokePermit2;
