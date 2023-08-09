import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { ContractDesc, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import LogoWithText from '../LogoWithText';
import { ellipsisTokenSymbol, getTokenSymbol } from '@/ui/utils/token';

interface ReceiverData {
  address: string;
  chain: Chain;
  eoa: {
    id: string;
    bornAt: number;
  } | null;
  cex: {
    id: string;
    name: string;
    logo: string;
    bornAt: number;
    isDeposit: boolean;
    supportToken?: boolean;
  } | null;
  contract: Record<string, ContractDesc> | null;
  usd_value: number;
  hasTransfer: boolean;
  isTokenContract: boolean;
  name: string | null;
  onTransferWhitelist: boolean;
  token?: TokenItem;
}

export interface Props {
  data: ReceiverData;
}

export interface ReceiverPopupProps extends Props {
  type: 'receiver';
}

export const ReceiverPopup: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  const receiverType = useMemo(() => {
    if (data.contract) {
      return 'Contract';
    }
    if (data.eoa) {
      return 'EOA';
    }
    if (data.cex) {
      return 'EOA';
    }
  }, [data]);

  const contractOnCurrentChain = useMemo(() => {
    if (!data.contract || !data.contract[data.chain.serverId]) return null;
    return data.contract[data.chain.serverId];
  }, [data]);

  const bornAt = useMemo(() => {
    if (data.contract) {
      if (contractOnCurrentChain) {
        return contractOnCurrentChain.create_at;
      } else {
        return null;
      }
    }
    if (data.cex) return data.cex.bornAt;
    if (data.eoa) return data.eoa.bornAt;
    return null;
  }, [data]);

  return (
    <div>
      <div className="title">
        {t('page.signTx.send.sendTo')}{' '}
        <Values.Address
          address={data.address}
          chain={data.chain}
          iconWidth="14px"
        />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row className="bg-[#F6F8FF]">{t('page.signTx.addressNote')}</Row>
          <Row>
            <Values.AddressMemo address={data.address} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">
            {t('page.signTx.addressTypeTitle')}
          </Row>
          <Row>
            <div>
              {receiverType}
              {((data.contract && !contractOnCurrentChain) ||
                data.name ||
                contractOnCurrentChain?.multisig) && (
                <ul className="desc-list">
                  {contractOnCurrentChain &&
                    contractOnCurrentChain.multisig && (
                      <li>MultiSig: {contractOnCurrentChain.multisig.name}</li>
                    )}
                  {data.contract && !contractOnCurrentChain && (
                    <li>{t('page.signTx.send.notOnThisChain')}</li>
                  )}
                  {data.name && <li>{data.name}</li>}
                </ul>
              )}
            </div>
          </Row>
        </Col>
        {data.cex && (
          <Col>
            <Row className="bg-[#F6F8FF]">
              {t('page.signTx.send.cexAddress')}
            </Row>
            <Row>
              <div>
                <LogoWithText logo={data.cex.logo} text={data.cex.name} />
                {(!data.cex.isDeposit || !data.cex.supportToken) && (
                  <ul className="desc-list">
                    {!data.cex.isDeposit && (
                      <li>{t('page.signTx.send.notTopupAddress')}</li>
                    )}
                    {!data.cex.supportToken && (
                      <li>
                        {t('page.signTx.send.tokenNotSupport', [
                          data.token
                            ? ellipsisTokenSymbol(getTokenSymbol(data.token))
                            : 'NFT',
                        ])}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </Row>
          </Col>
        )}
        {data.isTokenContract && (
          <Col>
            <Row className="bg-[#F6F8FF]">
              {t('page.signTx.send.receiverIsTokenAddress')}
            </Row>
            <Row>
              <Values.Boolean value={data.isTokenContract} />
            </Row>
          </Col>
        )}
        <Col>
          <Row className="bg-[#F6F8FF]">
            {data.contract
              ? t('page.signTx.deployTimeTitle')
              : t('page.signTx.firstOnChain')}
          </Row>
          <Row>
            <Values.TimeSpan value={bornAt} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">
            {t('page.signTx.send.addressBalanceTitle')}
          </Row>
          <Row>
            <Values.USDValue value={data.usd_value} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">{t('page.signTx.transacted')}</Row>
          <Row>
            <Values.Boolean value={data.hasTransfer} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">
            {t('page.signTx.send.whitelistTitle')}
          </Row>
          <Row>
            {data.onTransferWhitelist
              ? t('page.signTx.send.onMyWhitelist')
              : t('page.signTx.send.notOnWhitelist')}
          </Row>
        </Col>
      </Table>
    </div>
  );
};
