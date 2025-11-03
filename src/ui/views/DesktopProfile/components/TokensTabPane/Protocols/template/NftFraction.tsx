import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NftCollection,
  PortfolioItem,
} from '@rabby-wallet/rabby-api/dist/types';

import { ReactComponent as IconNftUsdInfo } from 'ui/assets/nft-view/nft-usd-info.svg';
import { HelperTooltip } from '../components/HelperTooltip';
import { Panel, ProxyTag, Table } from '../components';
import { getCollectionDisplayName } from '../utils/nft';
import { formatAmount, formatUsdValue } from '@/ui/utils';
import LabelWithIcon from '../components/LabelWithIcons';
import { TokenAvatar } from '../components/TokenAvatar';

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
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header headers={['Collection', 'Balance', 'USD Value']} />
          <Table.Body>
            {data
              .sort((m, n) =>
                !n?.stats?.net_usd_value && !m?.stats?.net_usd_value
                  ? (n?.detail?.share_token?.amount || 0) -
                    (m?.detail?.share_token?.amount || 0)
                  : (n?.stats?.net_usd_value || 0) -
                    (m?.stats?.net_usd_value || 0)
              )
              .map((p) => {
                return (
                  <FractionNftRow
                    key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}
                    collection={p?.detail?.collection}
                    usdValue={p?.stats?.net_usd_value}
                    amount={p?.detail?.share_token?.amount}
                    symbol={p?.detail?.share_token?.symbol}
                    controller={p?.pool?.controller}
                    name={props.name}
                    siteUrl={props.siteUrl}
                  />
                );
              })}
          </Table.Body>
        </Table>
      </Panel>
    );
  }
);

const FractionNftRow = ({
  collection,
  usdValue,
  amount,
  symbol = '',
  controller,
  name,
  siteUrl,
}: {
  collection?: NftCollection;
  usdValue: number;
  amount?: number;
  symbol?: string;
  controller?: string;
  name?: string;
  siteUrl?: string;
}) => {
  const { t } = useTranslation();
  const collectionName = getCollectionDisplayName(collection);

  if (!collection) return null;
  return (
    <Table.Row>
      <Col>
        <LabelWithIcon
          icon={
            <TokenAvatar
              logoClassName="rounded-[4px]"
              className="mr-[8px]"
              size={24}
              logo={collection.logo_url}
            />
          }
          labelClassName="text-[14px] text-r-neutral-title1"
          label={collectionName}
        />
      </Col>
      <Col>
        <div className="text-[14px] text-r-neutral-title1 px-[10px] py-[15px]">
          {formatAmount(amount ?? 0)} {symbol}
        </div>
      </Col>
      <Col>
        {usdValue ? (
          <div className="flex items-center justify-end text-[14px] text-r-neutral-title1">
            {formatUsdValue(usdValue)}
            <HelperTooltip title="Calculate based on the price of the linked ERC20 token.">
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
  );
};
