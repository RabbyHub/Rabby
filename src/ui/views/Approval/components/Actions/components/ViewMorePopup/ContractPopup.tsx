import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import { useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';

interface ContractData {
  address: string;
  chain: Chain;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  hasInteraction: boolean;
  bornAt: number | null;
  rank: number | null;
  title?: string;
}

export interface Props {
  data: ContractData;
}

export interface ContractPopupProps extends Props {
  type: 'contract';
}

export const ContractPopup: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  const { contractBlacklist, contractWhitelist } = useRabbySelector((state) => {
    return state.securityEngine.userData;
  });

  const { isInBlackList, isInWhiteList } = useMemo(() => {
    return {
      isInBlackList: contractBlacklist.some(
        ({ address, chainId }) =>
          isSameAddress(address, data.address) &&
          chainId === data.chain.serverId
      ),
      isInWhiteList: contractWhitelist.some(
        ({ address, chainId }) =>
          isSameAddress(address, data.address) &&
          chainId === data.chain.serverId
      ),
    };
  }, [data.address, data.chain, contractBlacklist, contractWhitelist]);
  return (
    <div>
      <div className="title">
        {data.title || t('page.signTx.interactContract')}{' '}
        <Values.AddressWithCopy
          address={data.address}
          chain={data.chain}
          iconWidth="14px"
        />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row>{t('page.signTx.protocolTitle')}</Row>
          <Row>
            <Values.Protocol value={data.protocol} />
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.interacted')}</Row>
          <Row>
            <Values.Boolean value={data.hasInteraction} />
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.deployTimeTitle')}</Row>
          <Row>
            <Values.TimeSpan value={data.bornAt} />
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.popularity')}</Row>
          <Row>
            {data.rank
              ? t('page.signTx.contractPopularity', [
                  data.rank,
                  data.chain.name,
                ])
              : '-'}
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.addressNote')}</Row>
          <Row>
            <Values.AddressMemo address={data.address} />
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.myMark')}</Row>
          <Row>
            <Values.AddressMark
              isContract
              address={data.address}
              chain={data.chain}
              onBlacklist={isInBlackList}
              onWhitelist={isInWhiteList}
              onChange={() => null}
            />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
