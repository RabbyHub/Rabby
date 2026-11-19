import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  ApproveNFTRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import * as Values from './components/Values';
import { ProtocolListItem } from './components/ProtocolListItem';
import ViewMore from './components/ViewMore';
import { SubTable, SubCol, SubRow } from './components/SubTable';
import { Chain } from '@/types/chain';
import styles from './RevokeNFTCollection.module.css';

const RevokeNFTCollection = ({
  data,
  requireData,
  chain,
}: {
  data: ParsedTransactionActionData['approveNFTCollection'];
  requireData: ApproveNFTRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const isTestnet = chain.isTestnet;

  return (
    <div className={styles.wrapper}>
      <Table>
        <Col>
          <Row isTitle>
            {t('page.signTx.revokeNFTCollectionApprove.revokeCollection')}
          </Row>
          <Row>
            {isTestnet ? (
              <div className="cursor-pointer group-hover:underline hover:text-r-blue-default">
                {actionData?.collection?.name ?? '-'}
              </div>
            ) : (
              <ViewMore
                type="collection"
                data={{
                  collection: actionData.collection,
                  chain,
                }}
              >
                <div className="cursor-pointer group-hover:underline hover:text-r-blue-default">
                  {actionData?.collection?.name ?? '-'}
                </div>
              </ViewMore>
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle itemsCenter>
            {t('page.signTx.revokeTokenApprove.revokeFrom')}
          </Row>
          <Row>
            {isTestnet ? (
              <Values.Address
                id="revoke-collection-address"
                hasHover
                address={actionData.spender}
                chain={chain}
              />
            ) : (
              <ViewMore
                type="nftSpender"
                data={{
                  ...requireData,
                  spender: actionData.spender,
                  chain,
                  isRevoke: true,
                }}
              >
                <Values.Address
                  id="revoke-collection-address"
                  hasHover
                  address={actionData.spender}
                  chain={chain}
                />
              </ViewMore>
            )}
          </Row>
        </Col>

        <SubTable target="revoke-collection-address">
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

export default RevokeNFTCollection;
