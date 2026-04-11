import React, { Fragment, memo } from 'react';

import { ReactComponent as IconNftUsdInfo } from 'ui/assets/nft-view/nft-usd-info.svg';
import { HelperTooltip } from '../components/HelperTooltip';

import { Panel, ProxyTag, Table, Value } from '../components';
import { ArraySort } from '../utils';
import { polyNfts } from '../utils/nft';
import { formatUsdValue } from '@/ui/utils';
import {
  PortfolioItem,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';
import { ActionRow, hasActions } from '../components/ActionRow';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
    protocolLogo?: string;
    protocolName?: string;
  }) => {
    const { tag, protocolLogo, protocolName } = props;
    const data = props.data;
    const headers = ['Pool', 'Balance'];

    const hasDescription = data.some(
      (v) => v?.detail?.description !== undefined
    );
    const hasRewardTokenList = data.some(
      (v) => v?.detail?.reward_token_list !== undefined
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
            {data.map((p) => {
              const nfts = ArraySort(
                polyNfts(p?.detail?.supply_nft_list ?? []),
                (v) => v.amount || 0
              );
              const showActionRow = hasActions(p);
              return (
                <Fragment key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}>
                  <Table.Row
                    key={`${p?.name}`}
                    className={
                      showActionRow ? 'border-b-0 px-16 pb-0' : 'px-16 py-[5px]'
                    }
                  >
                    {hasDescription && (
                      <Value.String value={p?.detail?.description} />
                    )}
                    <Value.Tokens
                      value={p?.detail?.supply_token_list || []}
                      nfts={nfts}
                    />
                    <Value.BlancesWithNfts
                      tokens={p?.detail?.supply_token_list || []}
                      nfts={nfts}
                    />
                    {hasRewardTokenList && (
                      <Value.ClaimableTokens
                        value={
                          (Array.isArray(p?.detail?.reward_token_list)
                            ? p?.detail?.reward_token_list || []
                            : [p?.detail?.reward_token_list]
                          ).filter(Boolean) as PortfolioItemToken[]
                        }
                      />
                    )}
                    <Table.Col className="text-[14px] text-r-neutral-title1">
                      <div className="flex items-center justify-end text-[14px] text-r-neutral-title1">
                        {formatUsdValue(p?.stats?.net_usd_value)}
                        {!!nfts.length && (
                          <HelperTooltip title="NFT value not included.">
                            <IconNftUsdInfo
                              width={12}
                              height={12}
                              style={{ marginLeft: 4 }}
                            />
                          </HelperTooltip>
                        )}
                      </div>
                    </Table.Col>
                  </Table.Row>
                  {showActionRow && (
                    <ActionRow
                      className="px-16 pt-[0] pb-[17px] mt-[-6px]"
                      actionKeys={[
                        hasDescription ? 'default' : '',
                        'default',
                        hasActions(p, 'withdraw') ? 'withdraw' : 'default',
                        hasRewardTokenList
                          ? hasActions(p, 'claim')
                            ? 'claim'
                            : 'default'
                          : '',
                        'default',
                      ]}
                      portfolio={p}
                      protocolLogo={protocolLogo || ''}
                      protocolName={protocolName}
                    />
                  )}
                </Fragment>
              );
            })}
          </Table.Body>
        </Table>
      </Panel>
    );
  }
);
