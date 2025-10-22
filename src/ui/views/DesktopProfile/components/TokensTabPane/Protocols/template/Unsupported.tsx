import React, { memo } from 'react';
import styled from 'styled-components';

import { Panel, ProxyTag, Table, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

const Description = styled.span`
  margin-right: 8px;
`;

const UnsupportedText = styled.span`
  color: 'red';
`;

export default memo((props: { tag: string; data: PortfolioItem[] }) => {
  const { tag } = props;
  const data = props.data;
  const hasDescription = data.some((v: any) => !!v?.detail?.description);
  const headers = [hasDescription ? 'Name' : '', 'USD Value'];

  return (
    <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
      <Table>
        <Table.Header headers={headers} />
        <Table.Body>
          {data.map((p: any) => {
            return (
              <Table.Row>
                <Value.String
                  value={
                    <>
                      {p?.detail?.description ? (
                        <Description>{p?.detail?.description}</Description>
                      ) : null}
                      <UnsupportedText>Unsupported pool type</UnsupportedText>
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
