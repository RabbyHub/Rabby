import React, { memo } from 'react';

import { Panel, ProxyTag, Table, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';
import { useTranslation } from 'react-i18next';

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
              <Table.Row key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}>
                <Value.String
                  value={
                    <>
                      {p?.detail?.description ? (
                        <span className="mr-8">{p?.detail?.description}</span>
                      ) : null}
                      <span className="mt-10 font-medium text-center text-r-neutral-foot">
                        {t('page.dashboard.assets.table.unsupportedPoolType')}
                      </span>
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
