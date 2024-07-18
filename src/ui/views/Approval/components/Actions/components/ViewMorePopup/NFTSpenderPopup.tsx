import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import { useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';

interface NFTSpenderData {
  spender: string;
  chain: Chain;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  hasInteraction: boolean;
  bornAt: number | null;
  rank: number | null;
  riskExposure: number;
  isEOA: boolean;
  isDanger: boolean | null;
  isRevoke?: boolean;
}

export interface Props {
  data: NFTSpenderData;
}

export interface NFTSpenderPopupProps extends Props {
  type: 'nftSpender';
}

export const NFTSpenderPopup: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();

  const { contractBlacklist, contractWhitelist } = useRabbySelector((state) => {
    return state.securityEngine.userData;
  });

  const { isInBlackList, isInWhiteList } = useMemo(() => {
    return {
      isInBlackList: contractBlacklist.some(
        ({ address, chainId }) =>
          isSameAddress(address, data.spender) &&
          chainId === data.chain.serverId
      ),
      isInWhiteList: contractWhitelist.some(
        ({ address, chainId }) =>
          isSameAddress(address, data.spender) &&
          chainId === data.chain.serverId
      ),
    };
  }, [data.spender, data.chain, contractBlacklist, contractWhitelist]);
  return (
    <div>
      <div className="title">
        {data.isRevoke
          ? t('page.signTx.revokeTokenApprove.revokeFrom')
          : t('page.signTx.tokenApprove.approveTo')}{' '}
        <Values.AddressWithCopy
          address={data.spender}
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
          <Row>{t('page.signTx.addressTypeTitle')}</Row>
          <Row>{data.isEOA ? 'EOA' : 'Contract'}</Row>
        </Col>
        <Col>
          <Row>
            {data.isEOA
              ? t('page.signTx.firstOnChain')
              : t('page.signTx.deployTimeTitle')}
          </Row>
          <Row>
            <Values.TimeSpan value={data.bornAt} />
          </Row>
        </Col>
        <Col>
          <Row tip={t('page.signTx.nftApprove.nftContractTrustValueTip')}>
            {t('page.signTx.trustValue')}
          </Row>
          <Row>
            {data.riskExposure === null ? (
              '-'
            ) : (
              <Values.USDValue value={data.riskExposure} />
            )}
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
          <Row>{t('page.signTx.interacted')}</Row>
          <Row>
            <Values.Boolean value={data.hasInteraction} />
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.addressNote')}</Row>
          <Row>
            <Values.AddressMemo address={data.spender} />
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.myMark')}</Row>
          <Row>
            <Values.AddressMark
              isContract
              address={data.spender}
              chain={data.chain}
              onBlacklist={isInBlackList}
              onWhitelist={isInWhiteList}
              onChange={() => null}
            />
          </Row>
        </Col>
        {data.isDanger && (
          <Col>
            <Row>{t('page.signTx.tokenApprove.flagByRabby')}</Row>
            <Row>
              <Values.Boolean value={!!data.isDanger} />
            </Row>
          </Col>
        )}
      </Table>
    </div>
  );
};
