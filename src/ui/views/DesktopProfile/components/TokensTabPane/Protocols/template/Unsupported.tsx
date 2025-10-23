import React, { memo } from 'react';
import styled from 'styled-components';

import { Panel, ProxyTag, Table, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';
import { useTranslation } from 'react-i18next';

const Description = styled.span`
  margin-right: 8px;
`;

const UnsupportedText = styled.span`
  margin-top: 10px;
  font-weight: 500;
  text-align: center;
  color: var(--r-neutral-foot);
`;

export default memo((props: { tag: string; data: PortfolioItem[] }) => {
  const { tag } = props;
  const data = props.data;
  const hasDescription = data.some((v) => !!v?.detail?.description);
  const headers = [hasDescription ? 'Name' : '', 'USD Value'];
  const { t } = useTranslation();

  return (
    <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
      <Table>
        <Table.Header headers={headers} />
        <Table.Body>
          {data.map((p) => {
            return (
              <Table.Row>
                <Value.String
                  value={
                    <>
                      {p?.detail?.description ? (
                        <Description>{p?.detail?.description}</Description>
                      ) : null}
                      <UnsupportedText>
                        {t('page.dashboard.assets.table.unsupportedPoolType')}
                      </UnsupportedText>
                    </>
                  }
                />
                <Value.USDValue value={p.stats.net_usd_value} />
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </Panel>
  );
});
