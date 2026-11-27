import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  RevokeNFTRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import NFTWithName from './components/NFTWithName';
import * as Values from './components/Values';
import { ProtocolListItem } from './components/ProtocolListItem';
import ViewMore from './components/ViewMore';
import { SubCol, SubRow, SubTable } from './components/SubTable';
import { Chain } from '@/types/chain';
import styles from './RevokeNFT.module.css';

const RevokeNFT = ({
  data,
  requireData,
  chain,
}: {
  data: ParsedTransactionActionData['revokeNFT'];
  requireData: RevokeNFTRequireData;
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
          <Row isTitle>{t('page.signTx.revokeNFTApprove.revokeNFT')}</Row>
          <Row>
            <ViewMore
              type="nft"
              data={{
                nft: actionData.nft,
                chain,
              }}
            >
              <NFTWithName hasHover nft={actionData?.nft}></NFTWithName>
            </ViewMore>
          </Row>
        </Col>
        <Col>
          <Row isTitle itemsCenter>
            {t('page.signTx.revokeTokenApprove.revokeFrom')}
          </Row>
          <Row>
            {isTestnet ? (
              <Values.Address
                id="revoke-nft-address"
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
                  id="revoke-nft-address"
                  hasHover
                  address={actionData.spender}
                  chain={chain}
                />
              </ViewMore>
            )}
          </Row>
        </Col>

        <SubTable target="revoke-nft-address">
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

export default RevokeNFT;
