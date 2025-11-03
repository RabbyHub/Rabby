import dayjs from 'dayjs';
import React, { ReactNode, useMemo } from 'react';

import { ReactComponent as IconNftUsdInfo } from 'ui/assets/nft-view/nft-usd-info.svg';
import { HelperTooltip } from './HelperTooltip';
// import { LabelWithIcon } from '@/components/LabelWithIcon';
// import { TokenAvatar } from '@/components/TokenAvatar';

import { TokensAmount, getTokens, getUsd, numberWithCommas } from '../utils';
import { getCollectionDisplayName, polyNfts } from '../utils/nft';
import Table from './table';
import {
  PortfolioItemNft,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils/number';
import styled from 'styled-components';
import LabelWithIcon from './LabelWithIcons';
import { TokenAvatar } from './TokenAvatar';

const BalanceToken = styled.div`
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--r-neutral-title1);
`;

const Col = Table.Col;

export const String = ({ value, ...rest }: { value: ReactNode }) => {
  return (
    <Col className="text-[14px] text-r-neutral-title1" {...rest}>
      {value}
    </Col>
  );
};

export const Time = (props: { value: string | number | undefined }) => {
  return (
    <Col className="text-[14px] text-r-neutral-title1">
      {!props.value
        ? '-'
        : dayjs(Number(props.value) * 1000).format('YYYY/MM/DD HH:mm')}
    </Col>
  );
};

export const Balances = (props: {
  value?: PortfolioItemToken[] | PortfolioItemToken;
}) => {
  const value = props.value
    ? Array.isArray(props.value)
      ? props.value
      : [props.value]
    : undefined;

  return (
    <Col>
      {!value ? (
        ''
      ) : (
        <TokensAmount tokens={Array.isArray(value) ? value : [value]} />
      )}
    </Col>
  );
};

export const Balance = (props: { value?: PortfolioItemToken }) => {
  return (
    <Col>
      <TokensAmount tokens={props.value ? [props.value] : []} />
    </Col>
  );
};

export const TokensSlash = (props: { value: PortfolioItemToken[] }) => {
  const value = Array.isArray(props.value) ? props.value : [props.value];
  return <Col>{getTokens(value, '/')}</Col>;
};

export const Tokens = ({
  value,
  nfts,
  ...rest
}: {
  value: PortfolioItemToken[];
  nfts?: PortfolioItemNft[];
}) => {
  const _value = Array.isArray(value) ? value : [value];
  return <Col {...rest}>{getTokens(_value, '+', nfts)}</Col>;
};

export const Token = ({ value, ...rest }: { value?: PortfolioItemToken }) => {
  return <Tokens value={value ? [value] : []} {...rest} />;
};

export const USDValue = (props: { value: string | number }) => {
  return (
    <Col className="text-[14px] text-r-neutral-title1">
      {formatUsdValue(+props.value)}
    </Col>
  );
};

export const TokensUSDValue = (props: { value: PortfolioItemToken[] }) => {
  return (
    <Col className="text-[14px] text-r-neutral-title1">
      {getUsd(props.value, 0)}
    </Col>
  );
};

export const TokenUSDValue = (props: { value: PortfolioItemToken }) => {
  return <TokensUSDValue value={[props.value]} />;
};

export const Bool = (props: { value: number }) => {
  return (
    <Col className="text-[14px] text-r-neutral-title1">
      {props.value ? 'Yes' : 'No'}
    </Col>
  );
};

export const Percent = (props: { value?: number | string }) => {
  if (props.value === undefined || Number.isNaN(+props.value))
    return <Col></Col>;
  return (
    <Col className="text-[14px] text-r-neutral-title1">
      {numberWithCommas(+props.value! * 100, 2)}%
    </Col>
  );
};

export const NumberWithCommas = (props: { value?: number | string }) => {
  return (
    <Col className="text-[14px] text-r-neutral-title1">
      {numberWithCommas(props.value ?? 0, 2)}
    </Col>
  );
};

export const NumbersWithCommas = (props: {
  value: (number | string | undefined)[];
}) => {
  return (
    <Col className="text-[14px] text-r-neutral-title1">
      {props.value.map((v) => (v ? numberWithCommas(v, 2) : '-')).join(' / ')}
    </Col>
  );
};

export const ClaimableTokens = (props: {
  value: PortfolioItemToken | PortfolioItemToken[];
}) => {
  return (
    <Col>
      <TokensAmount
        tokens={Array.isArray(props.value) ? props.value : [props.value]}
        withPrice={true}
      />
    </Col>
  );
};

export const BlancesWithNfts = ({
  tokens,
  nfts,
}: {
  tokens: PortfolioItemToken[];
  nfts?: PortfolioItemNft[];
}) => {
  const hasNft = !!nfts?.length;
  return (
    <Col>
      {hasNft &&
        nfts.map((n) => (
          <BalanceToken>
            <span>{getCollectionDisplayName(n.collection)}</span> x{n.amount}
          </BalanceToken>
        ))}
      <TokensAmount tokens={tokens} />
    </Col>
  );
};

export const NFTTable = ({
  name,
  tokens,
}: {
  name: string;
  tokens?: PortfolioItemNft[];
}) => {
  const headers = useMemo(() => [name, 'Balance', 'USD Value'], [name]);

  const nfts = useMemo(
    () =>
      tokens?.length
        ? polyNfts(tokens)
            .sort((m, n) => (n.amount || 0) - (m.amount || 0))
            .map((x) => {
              const collection = x.collection;
              const collectionName = getCollectionDisplayName(collection);

              return {
                ...x,
                collectionName,
              };
            })
        : [],
    [tokens]
  );

  return tokens?.length ? (
    <Table>
      <Table.Header headers={headers} />
      <Table.Body>
        {nfts?.map((x, i) => (
          <Table.Row key={i}>
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
                  <span className="text-[14px] text-r-neutral-title1">
                    {x.collectionName}
                  </span>
                }
              />
            </Col>
            <Col>
              <div className="text-[14px] text-r-neutral-title1">
                <span>{x.collectionName}</span> x{x.amount}
              </div>
            </Col>
            <Col>
              <div className="flex items-center justify-end text-[14px] text-r-neutral-title1">
                <span>-</span>
                <HelperTooltip title="NFT value not included in the net worth of this protocol">
                  <IconNftUsdInfo
                    width={12}
                    height={12}
                    style={{ marginLeft: 4 }}
                  />
                </HelperTooltip>
              </div>
            </Col>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ) : null;
};

export const TokenTable = ({
  name,
  tokens,
}: {
  name: string;
  tokens?: PortfolioItemToken[];
}) => {
  const headers = useMemo(() => [name, 'Balance', 'USD Value'], [name]);

  const _tokens = useMemo(
    () =>
      tokens?.length
        ? tokens
            ?.map((x) => ({
              ...x,
              _netWorth: x.amount * x.price,
            }))
            .sort((m, n) => n._netWorth - m._netWorth)
        : [],
    [tokens]
  );

  return _tokens?.length > 0 ? (
    <Table>
      <Table.Header headers={headers} />
      <Table.Body>
        {_tokens?.map((token, i) => {
          return (
            <Table.Row key={i}>
              <Token value={token} />
              <Balance value={token} />
              <USDValue value={token._netWorth} />
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  ) : null;
};
