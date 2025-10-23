import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'clsx';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import { ReactComponent as IconNftUsdInfo } from 'ui/assets/nft-view/nft-usd-info.svg';
import { HelperTooltip } from '../components/HelperTooltip';
import { Tips } from '../components/Tips';

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
import { getCollectionDisplayName, polyNfts } from '../utils/nft';
import { formatUsdValue } from '@/ui/utils';
import { LineCard } from './Lending';
import LabelWithIcon from '../components/LabelWithIcons';
import { TokenAvatar } from '../components/TokenAvatar';
import { ActionRow, hasActions } from '../components/ActionRow';

const Col = Table.Col;

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
    protocolLogo?: string;
  }) => {
    const { t } = useTranslation();

    const { tag, protocolLogo } = props;
    const data = props.data;

    return (
      <>
        {data.map((p) => {
          const supplyHeaders = ['Supplied', 'Balance', 'USD Value'];
          const borrowHeaders = ['Borrowed', 'Balance', 'USD Value'];
          const supplyTokenList = p?.detail?.supply_token_list || [];
          const supplyNftList = p?.detail?.supply_nft_list || [];
          const borrowTokenList = p?.detail?.borrow_token_list || [];
          const showWithdrawActionRow = hasActions(p, 'withdraw');
          const showClaimActionRow = hasActions(p, 'claim');
          return (
            <Panel
              key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}
              proposalTag={<BookMark content={tag} />}
              subTag={<ProxyTag item={data[0]} />}
            >
              <LineCard>
                <More
                  className={cx(
                    'mb-0',
                    p?.detail?.health_rate ? 'mt-[8px]' : ''
                  )}
                >
                  {p?.detail?.health_rate ? (
                    <KV
                      k={
                        <Tips
                          ghost
                          className="text-13 text-r-neutral-foot font-normal"
                          title="Your assets will be liquidated if the health factor is less than or equal to 1"
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
                {supplyTokenList.length > 0 || supplyNftList.length > 0 ? (
                  <Table>
                    <Table.Header headers={supplyHeaders} />
                    <Table.Body>
                      {polyNfts(p?.detail?.supply_nft_list ?? [])
                        .map((x) => {
                          const collection = x.collection;
                          const floorToken = collection?.floor_price_token;
                          const usdValue = floorToken
                            ? floorToken.amount * floorToken.price * x.amount
                            : 0;
                          const _usdValue = usdValue
                            ? formatUsdValue(usdValue)
                            : '-';
                          const collectionName = getCollectionDisplayName(
                            collection
                          );

                          return {
                            ...x,
                            usdValue,
                            _usdValue,
                            collectionName,
                          };
                        })
                        .sort((m, n) => n.usdValue - m.usdValue)
                        .map((x) => (
                          <Table.Row
                            key={x?.id}
                            className="border-b-0 px-16 py-[5px]"
                          >
                            <Col>
                              <LabelWithIcon
                                icon={
                                  <TokenAvatar
                                    logoClassName="rounded-[4px]"
                                    className="mr-[8px]"
                                    size={24}
                                    logo={x.collection.logo_url}
                                  />
                                }
                                label={
                                  <span className="text-[15px] text-r-neutral-title1 font-medium">
                                    {x.collectionName}
                                  </span>
                                }
                              />
                            </Col>
                            <Col>
                              <div className="text-[15px] text-r-neutral-title1 font-medium px-[10px] py-[15px]">
                                <span>{x.collectionName}</span> x{x.amount}
                              </div>
                            </Col>
                            <Col>
                              {x.usdValue ? (
                                <div className="flex items-center justify-end text-[15px] text-r-neutral-title1 font-medium">
                                  {x._usdValue}
                                  <HelperTooltip title="Calculated based on the floor price recognized by this protocol.">
                                    <IconNftUsdInfo
                                      width={12}
                                      height={12}
                                      style={{ marginLeft: 4 }}
                                    />
                                  </HelperTooltip>
                                </div>
                              ) : (
                                '-'
                              )}
                            </Col>
                          </Table.Row>
                        ))}
                      {ArraySort(
                        supplyTokenList,
                        (v) => v.amount * (v.price || 0)
                      )?.map((token, index) => {
                        const last =
                          index === (supplyTokenList?.length || 0) - 1;
                        return (
                          <Table.Row
                            key={token?.id}
                            className={cx(
                              'border-b-0',
                              last && showWithdrawActionRow
                                ? 'px-16 pb-0'
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
                        />
                      )}
                    </Table.Body>
                  </Table>
                ) : null}
                {borrowTokenList?.length > 0 ? (
                  <Table>
                    <Table.Header headers={borrowHeaders} />
                    <Table.Body>
                      {ArraySort(
                        borrowTokenList,
                        (v) => v.amount * (v.price || 0)
                      )?.map((token, index) => {
                        const last =
                          index === (borrowTokenList?.length || 0) - 1;
                        return (
                          <Table.Row
                            key={token?.id}
                            className={cx(
                              'border-b-0',
                              last && showClaimActionRow
                                ? 'px-16 pb-0'
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
                        />
                      )}
                    </Table.Body>
                  </Table>
                ) : null}
              </LineCard>
            </Panel>
          );
        })}
      </>
    );
  }
);
