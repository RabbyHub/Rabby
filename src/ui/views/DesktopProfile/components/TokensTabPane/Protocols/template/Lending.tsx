import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Tips } from '../components/Tips';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import {
  BookMark,
  KV,
  More,
  Panel,
  ProxyTag,
  Table,
  Value,
} from '../components';
import { ArraySort } from '../utils';
import cx from 'clsx';
import styled from 'styled-components';
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
    const { t } = useTranslation();

    const { tag, protocolLogo, protocolName } = props;
    const data = props.data;

    return (
      <>
        {data.map((p) => {
          const supplyHeaders = ['Supplied', 'Balance', 'USD Value'];
          const borrowHeaders = ['Borrowed', 'Balance', 'USD Value'];
          const rewardHeaders = ['Rewards', 'Balance', 'USD Value'];
          const showWithdrawActionRow = hasActions(p, 'withdraw');
          const showClaimActionRow = hasActions(p, 'claim');
          return (
            <Panel
              key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}
              proposalTag={<BookMark content={tag} />}
              subTag={<ProxyTag item={data[0]} />}
              moreContent={
                <More className="ml-12">
                  {p?.detail?.health_rate ? (
                    <KV
                      k={
                        <Tips
                          ghost
                          className="text-13 text-r-neutral-foot font-normal"
                          title={
                            'Your assets will be liquidated if the health factor is less than or equal to 1'
                          }
                        >
                          Health Rate
                        </Tips>
                      }
                      v={
                        p?.detail?.health_rate <= 10
                          ? p?.detail?.health_rate.toFixed(2)
                          : '>10'
                      }
                      vClassName={cx(
                        p?.detail?.health_rate < 1.1
                          ? 'text-r-red-default'
                          : p?.detail?.health_rate < 1.2
                          ? 'text-r-orange-default'
                          : 'text-r-neutral-title1'
                      )}
                    />
                  ) : null}
                </More>
              }
            >
              <div>
                {p?.detail?.supply_token_list?.length &&
                p?.detail?.supply_token_list?.length > 0 ? (
                  <Table>
                    <Table.Header headers={supplyHeaders} />
                    <Table.Body>
                      {ArraySort(
                        p?.detail?.supply_token_list,
                        (v) => v.amount * (v.price || 0)
                      )?.map((token, index) => {
                        const last =
                          index ===
                          (p?.detail?.supply_token_list?.length || 0) - 1;
                        return (
                          <Table.Row
                            key={token?.id}
                            className={cx(
                              last && showWithdrawActionRow
                                ? 'px-16 pb-0 border-b-0'
                                : 'px-16 py-[5px]'
                            )}
                          >
                            <Value.Token value={token} />
                            <Value.Balance value={token} />
                            <Value.USDValue
                              value={token.amount * token.price}
                            />
                          </Table.Row>
                        );
                      })}
                      {showWithdrawActionRow && (
                        <ActionRow
                          className="px-16 pt-[0] pb-[17px] mt-[-6px]"
                          actionKeys={['default', 'withdraw', 'default']}
                          portfolio={p}
                          protocolLogo={protocolLogo || ''}
                          protocolName={protocolName}
                        />
                      )}
                    </Table.Body>
                  </Table>
                ) : null}
                {p?.detail?.borrow_token_list?.length &&
                  p?.detail?.borrow_token_list?.length > 0 && (
                    <Table>
                      <Table.Header headers={borrowHeaders} />
                      <Table.Body>
                        {ArraySort(
                          p?.detail?.borrow_token_list,
                          (v) => v.amount * (v.price || 0)
                        )?.map((token) => {
                          return (
                            <Table.Row
                              key={token?.id}
                              className="border-b-0 px-16 py-[5px]"
                            >
                              <Value.Token value={token} />
                              <Value.Balance value={token} />
                              <Value.USDValue
                                value={token.amount * token.price}
                              />
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table>
                  )}

                {p?.detail?.reward_token_list?.length &&
                  p?.detail?.reward_token_list?.length > 0 && (
                    <Table>
                      <Table.Header headers={rewardHeaders} />
                      <Table.Body>
                        {ArraySort(
                          p?.detail?.reward_token_list,
                          (v) => v.amount * (v.price || 0)
                        )?.map((token, index) => {
                          const last =
                            index ===
                            (p?.detail?.reward_token_list?.length || 0) - 1;
                          return (
                            <Table.Row
                              key={token?.id}
                              className={cx(
                                last && showClaimActionRow
                                  ? 'px-16 pb-0 border-b-0'
                                  : 'px-16 py-[5px]'
                              )}
                            >
                              <Value.Token value={token} />
                              <Value.Balance value={token} />
                              <Value.USDValue
                                value={token.amount * token.price}
                              />
                            </Table.Row>
                          );
                        })}
                        {showClaimActionRow && (
                          <ActionRow
                            className="px-16 pt-[0] pb-[17px] mt-[-6px]"
                            actionKeys={['default', 'claim', 'default']}
                            portfolio={p}
                            protocolLogo={protocolLogo || ''}
                            protocolName={protocolName}
                          />
                        )}
                      </Table.Body>
                    </Table>
                  )}
              </div>
            </Panel>
          );
        })}
      </>
    );
  }
);
