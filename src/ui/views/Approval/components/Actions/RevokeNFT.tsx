import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ParsedActionData, RevokeNFTRequireData } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import NFTWithName from './components/NFTWithName';
import * as Values from './components/Values';
import { ProtocolListItem } from './components/ProtocolListItem';
import ViewMore from './components/ViewMore';
import { SubCol, SubRow, SubTable } from './components/SubTable';

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
  li .name-and-address {
    justify-content: flex-start;
    .address {
      font-weight: 400;
      font-size: 12px;
      line-height: 14px;
      color: #999999;
    }
    img {
      width: 12px !important;
      height: 12px !important;
      margin-left: 4px !important;
    }
  }
`;

const RevokeNFT = ({
  data,
  requireData,
  chain,
}: {
  data: ParsedActionData['revokeNFT'];
  requireData: RevokeNFTRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  return (
    <Wrapper>
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
    </Wrapper>
  );
};

export default RevokeNFT;
