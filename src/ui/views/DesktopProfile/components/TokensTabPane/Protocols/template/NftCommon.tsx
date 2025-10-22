import React, { memo } from 'react';

import { ReactComponent as IconNftUsdInfo } from 'ui/assets/nft-view/nft-usd-info.svg';
import { HelperTooltip } from '../components/HelperTooltip';

import { Panel, ProxyTag, Table, Value } from '../components';
import { ArraySort } from '../utils';
import { polyNfts } from '../utils/nft';
import { formatUsdValue } from '@/ui/utils';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
  }) => {
    const { tag } = props;
    const data = props.data;
    const headers = ['Pool', 'Balance'];

    const hasDescription = data.some(
      (v: any) => v?.detail?.description !== undefined
    );
    const hasRewardTokenList = data.some(
      (v: any) => v?.detail?.reward_token_list !== undefined
    );

    if (hasRewardTokenList) headers.push('Rewards');
    if (hasDescription) headers.unshift('');

    headers.push('USD Value');

    return (
      <Panel
        tag={tag}
        subTag={<ProxyTag item={(data[0] as unknown) as PortfolioItem} />}
      >
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            {data.map((p: any) => {
              const nfts = ArraySort(
                polyNfts(p?.detail?.supply_nft_list ?? []),
                (v) => v.amount || 0
              );
              return (
                <Table.Row>
                  {hasDescription && (
                    <Value.String value={p?.detail?.description} />
                  )}
                  <Value.Tokens
                    value={p?.detail?.supply_token_list}
                    nfts={nfts}
                  />
                  <Value.BlancesWithNfts
                    tokens={p?.detail?.supply_token_list}
                    nfts={nfts}
                  />
                  {hasRewardTokenList && (
                    <Value.ClaimableTokens
                      value={
                        Array.isArray(p?.detail?.reward_token_list)
                          ? p?.detail?.reward_token_list
                          : [p?.detail?.reward_token_list]
                      }
                    />
                  )}
                  <Table.Col>
                    {formatUsdValue(p?.stats?.net_usd_value)}
                    {!!nfts.length && (
                      <HelperTooltip title="NFT value not included.">
                        <IconNftUsdInfo
                          width={10}
                          height={10}
                          style={{ marginLeft: 4 }}
                        />
                      </HelperTooltip>
                    )}
                  </Table.Col>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </Panel>
    );
  }
);
