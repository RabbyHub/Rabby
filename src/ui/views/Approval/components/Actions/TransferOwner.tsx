import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  ParsedTransactionActionData,
  TransferOwnerRequireData,
} from '@rabby-wallet/rabby-action';
import { Table, Col, Row } from './components/Table';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { SecurityListItem } from './components/SecurityListItem';
import { SubCol, SubRow, SubTable } from './components/SubTable';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
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

const TransferOwner = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedTransactionActionData['transferOwner'];
  requireData: TransferOwnerRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const { t } = useTranslation();

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const receiver = requireData.receiver;

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.transferOwner.description')}</Row>
          <Row className="flex flex-row items-center gap-x-4" wrap>
            {actionData.description}
          </Row>
        </Col>
        <Col>
          <Row isTitle itemsCenter>
            {t('page.signTx.send.sendTo')}
          </Row>
          <Row>
            <ViewMore
              type="receiver"
              data={{
                address: actionData.to,
                chain,
                eoa: receiver!.eoa,
                cex: receiver!.cex,
                contract: receiver!.contract,
                usd_value: receiver!.usd_value,
                hasTransfer: receiver!.hasTransfer,
                isTokenContract: receiver!.isTokenContract,
                name: receiver!.name,
                onTransferWhitelist: receiver!.onTransferWhitelist,
                hasReceiverMnemonicInWallet: receiver!
                  .hasReceiverMnemonicInWallet,
                hasReceiverPrivateKeyInWallet: receiver!
                  .hasReceiverPrivateKeyInWallet,
              }}
            >
              <Values.Address
                id="send-contract"
                hasHover
                address={actionData.to}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="send-contract">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
            <SubRow>
              <Values.AddressMemo address={actionData.to} />
            </SubRow>
          </SubCol>
          <SecurityListItem
            title={t('page.signTx.send.whitelistTitle')}
            engineResult={engineResultMap['1151']}
            dangerText={t('page.signTx.send.notOnWhitelist')}
            id="1151"
          />
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default TransferOwner;
