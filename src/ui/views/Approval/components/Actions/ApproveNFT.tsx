import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ApproveNFTRequireData, ParsedActionData } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import NFTWithName from './components/NFTWithName';
import * as Values from './components/Values';
import { SecurityListItem } from './components/SecurityListItem';
import ViewMore from './components/ViewMore';
import { ProtocolListItem } from './components/ProtocolListItem';

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
  data: ParsedActionData['approveNFT'];
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

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.nftApprove.approveNFT')}</Row>
          <Row>
            <NFTWithName nft={actionData?.nft}></NFTWithName>
            <ul className="desc-list">
              <li>
                <ViewMore
                  type="nft"
                  data={{
                    nft: actionData.nft,
                    chain,
                  }}
                />
              </li>
            </ul>
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
                id="1043"
                engineResult={engineResultMap['1043']}
                dangerText={t('page.signTx.tokenApprove.eoaAddress')}
              />

              <SecurityListItem
                id="1048"
                engineResult={engineResultMap['1048']}
                warningText={<Values.Interacted value={false} />}
                defaultText={
                  <Values.Interacted value={requireData.hasInteraction} />
                }
              />

              <SecurityListItem
                id="1044"
                engineResult={engineResultMap['1044']}
                dangerText={t('page.signTx.tokenApprove.trustValueLessThan', {
                  value: '$10,000',
                })}
                warningText={t('page.signTx.tokenApprove.trustValueLessThan', {
                  value: '$100,000',
                })}
              />

              <SecurityListItem
                id="1045"
                engineResult={engineResultMap['1045']}
                warningText={t('page.signTx.tokenApprove.deployTimeLessThan', {
                  value: '3',
                })}
              />

              <SecurityListItem
                id="1052"
                engineResult={engineResultMap['1052']}
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
                  type="nftSpender"
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

export default ApproveNFT;
