// TODO: Translate
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

import { ReactComponent as IconNftUsdInfo } from 'ui/assets/nft-view/nft-usd-info.svg';
import { HelperTooltip } from '../components/HelperTooltip';
import { Tips } from '../components/Tips';
// import { TokenAvatar } from '@/components/TokenAvatar';
// import { LabelWithIcon } from '@/components/LabelWithIcon';
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
import { getCollectionDisplayName, polyNfts } from '../utils/nft';
import { formatUsdValue } from '@/ui/utils';

const style = {
  nftLogo: 'border-radius: 4px !important;',
  nftIcon: 'margin-right: 8px;',
  valueText: 'padding: 15px 10px;',
  detailLink:
    'color: inherit !important; &:hover { color: var(--color-blue) !important; text-decoration: underline; }',
  red: 'color: var(--color-red);',
  warn: 'color: var(--color-orange);',
};

const Col = Table.Col;

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
  }) => {
    const { t } = useTranslation();

    const { tag } = props;
    const data = props.data;

    return (
      <>
        {data.map((p: any) => {
          const supplyHeaders = ['Supplied', 'Balance', 'USD Value'];
          const borrowHeaders = ['Borrowed', 'Balance', 'USD Value'];
          return (
            <Panel
              proposalTag={<BookMark content={tag} />}
              subTag={<ProxyTag item={data[0]} />}
            >
              <More>
                {p?.detail?.health_rate ? (
                  <KV
                    k={
                      <Tips title="Your assets will be liquidated if the health factor is less than or equal to 1">
                        Health Rate
                      </Tips>
                    }
                    v={
                      p?.detail?.health_rate <= 10
                        ? p?.detail?.health_rate.toFixed(2)
                        : '>10'
                    }
                    vClassName={
                      p?.detail?.health_rate < 1.1
                        ? style.red
                        : p?.detail?.health_rate < 1.2
                        ? style.warn
                        : undefined
                    }
                  />
                ) : null}
              </More>
              {p?.detail?.supply_token_list?.length > 0 ||
              p?.detail?.supply_nft_list?.length > 0 ? (
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
                        <Table.Row>
                          <Col>
                            {/* <LabelWithIcon
                              icon={
                                <TokenAvatar
                                  logoClassName={style.nftLogo}
                                  className={style.nftIcon}
                                  size={24}
                                  logo={x.collection.logo_url}
                                />
                              }
                              label={
                                <NavLink
                                  target="_blank"
                                  to={`/nfts/${x.collection.chain_id}/${x.collection.id}`}
                                  className={style.detailLink}
                                >
                                  {x.collectionName}
                                </NavLink>
                              }
                            /> */}
                          </Col>
                          <Col>
                            <div className={style.valueText}>
                              {
                                <NavLink
                                  target="_blank"
                                  to={`/nfts/${x.collection.chain_id}/${x.collection.id}`}
                                  className={style.detailLink}
                                >
                                  {x.collectionName}
                                </NavLink>
                              }{' '}
                              x{x.amount}
                            </div>
                          </Col>
                          <Col>
                            {x.usdValue ? (
                              <>
                                {x._usdValue}
                                <HelperTooltip title="Calculated based on the floor price recognized by this protocol.">
                                  <IconNftUsdInfo
                                    width={10}
                                    height={10}
                                    style={{ marginLeft: 4 }}
                                  />
                                </HelperTooltip>
                              </>
                            ) : (
                              '-'
                            )}
                          </Col>
                        </Table.Row>
                      ))}
                    {ArraySort(
                      p?.detail?.supply_token_list,
                      (v) => v.amount * (v.price || 0)
                    )?.map((token: any) => {
                      return (
                        <Table.Row>
                          <Value.Token value={token} />
                          <Value.Balance value={token} />
                          <Value.USDValue value={token.amount * token.price} />
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              ) : null}
              {p?.detail?.borrow_token_list?.length > 0 ? (
                <Table>
                  <Table.Header headers={borrowHeaders} />
                  <Table.Body>
                    {ArraySort(
                      p?.detail?.borrow_token_list,
                      (v) => v.amount * (v.price || 0)
                    )?.map((token: any) => {
                      return (
                        <Table.Row>
                          <Value.Token value={token} />
                          <Value.Balance value={token} />
                          <Value.USDValue value={token.amount * token.price} />
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              ) : null}
            </Panel>
          );
        })}
      </>
    );
  }
);
