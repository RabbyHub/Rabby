import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  ApproveNFTRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import NFTWithName from './components/NFTWithName';
import * as Values from './components/Values';
import { SecurityListItem } from './components/SecurityListItem';
import ViewMore from './components/ViewMore';
import { ProtocolListItem } from './components/ProtocolListItem';
import { SubTable, SubCol, SubRow } from './components/SubTable';
import { Chain } from '@/types/chain';

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

const ApproveNFT = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedTransactionActionData['approveNFT'];
  requireData: ApproveNFTRequireData;
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

  const isTestnet = chain.isTestnet;

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.nftApprove.approveNFT')}</Row>
          <Row className="max-w-[240px]">
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
            {t('page.signTx.tokenApprove.approveTo')}
          </Row>
          <Row>
            {isTestnet ? (
              <Values.Address
                id="approve-nft-address"
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
                }}
              >
                <Values.Address
                  id="approve-nft-address"
                  hasHover
                  address={actionData.spender}
                  chain={chain}
                />
              </ViewMore>
            )}
          </Row>
        </Col>
        <SubTable target="approve-nft-address">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.protocol')}</SubRow>
            <SubRow>
              <ProtocolListItem protocol={requireData.protocol} />
            </SubRow>
          </SubCol>
          {isTestnet ? null : (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.interacted')}</SubRow>
              <SubRow>
                <Values.Boolean value={requireData.hasInteraction} />
              </SubRow>
            </SubCol>
          )}

          <SecurityListItem
            id="1043"
            engineResult={engineResultMap['1043']}
            dangerText={t('page.signTx.tokenApprove.eoaAddress')}
            title={t('page.signTx.addressTypeTitle')}
          />

          <SecurityListItem
            tip={t('page.signTx.tokenApprove.contractTrustValueTip')}
            id="1147"
            engineResult={engineResultMap['1147']}
            warningText={'$0'}
            title={t('page.signTx.trustValueTitle')}
          />

          <SecurityListItem
            id="1045"
            engineResult={engineResultMap['1045']}
            warningText={t('page.signTx.tokenApprove.deployTimeLessThan', {
              value: '3',
            })}
            title={t('page.signTx.deployTimeTitle')}
          />

          <SecurityListItem
            id="1052"
            engineResult={engineResultMap['1052']}
            title={t('page.signTx.tokenApprove.flagByRabby')}
            dangerText={t('page.signTx.yes')}
          />

          <SecurityListItem
            title={t('page.signTx.myMark')}
            id="1134"
            engineResult={engineResultMap['1134']}
            forbiddenText={t('page.signTx.markAsBlock')}
          />

          <SecurityListItem
            title={t('page.signTx.myMark')}
            id="1136"
            engineResult={engineResultMap['1136']}
            warningText={t('page.signTx.markAsBlock')}
          />

          <SecurityListItem
            title={t('page.signTx.myMark')}
            id="1133"
            engineResult={engineResultMap['1133']}
            safeText={t('page.signTx.markAsTrust')}
          />
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default ApproveNFT;
