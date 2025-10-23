import React, { memo } from 'react';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import { BookMark, Panel, ProxyTag, Table, Value } from '../components';
import styled from 'styled-components';

const LineCard = styled.div`
  > div {
    border-bottom: 0.5px solid var(--r-neutral-line);
  }

  > div:last-child {
    border-bottom: none;
  }
`;

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
  }) => {
    const { tag } = props;
    const data: any = props.data;
    return data.map((p: any) => {
      return (
        <Panel
          proposalTag={<BookMark content={tag} />}
          subTag={<ProxyTag item={data[0]} />}
        >
          <LineCard>
            <Table>
              <Table.Header
                headers={[
                  'Type',
                  'Underlying',
                  'Strike',
                  'Style',
                  'Expiration',
                  'USD Value',
                ]}
              />
              <Table.Body>
                <Table.Row>
                  <Value.String value={p?.detail?.type} />
                  <Value.Balances value={p?.detail?.underlying_token} />
                  <Value.Balances value={p?.detail?.strike_token} />
                  <Value.String value={p?.detail?.style} />
                  <Value.Time value={p?.detail?.exercise_end_at} />
                  <Value.USDValue value={p?.stats?.net_usd_value} />
                </Table.Row>
              </Table.Body>
            </Table>

            {Boolean(p?.detail?.collateral_token_list?.length) && (
              <Table>
                <Table.Header
                  headers={['Collateral', 'Balance', 'USD Value']}
                />
                <Table.Body>
                  {p?.detail?.collateral_token_list.map((token: any) => {
                    return (
                      <Table.Row>
                        <Value.Token value={token} />
                        <Value.Balance value={token} />
                        <Value.TokenUSDValue value={token} />
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            )}
          </LineCard>
        </Panel>
      );
    });
  }
);
