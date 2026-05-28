import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { openInTab } from '@/ui/utils';
import { getAddressScanLink } from '@/utils';
import { findChainByServerID } from '@/utils/chain';

import { ProtocolLogo, TokenLogos } from './PoolVisuals';
import { ExternalIcon } from '../icons';
import type { StakingLink, StakingPool, StakingToken } from '../types';
import { shortenStakingAddress } from '../utils/format';

const getPoolLinks = (pool: StakingPool, t: TFunction) => {
  const links: StakingLink[] = [];

  if (pool.protocol.site_url) {
    links.push({
      type: 'website',
      name: t('page.staking.about.officialWebsite'),
      url: pool.protocol.site_url,
    });
  }

  if (pool.protocol.twitter_url) {
    links.push({
      type: 'twitter',
      name: t('page.staking.about.twitter'),
      url: pool.protocol.twitter_url,
    });
  }

  if (pool.protocol.about?.links?.length) {
    links.push(...pool.protocol.about.links);
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    if (!link.url || seen.has(link.url)) {
      return false;
    }
    seen.add(link.url);
    return true;
  });
};

const getTwitterHandleFromUrl = (url?: string | null) => {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'twitter.com' && host !== 'x.com') {
      return '';
    }

    const handle = parsed.pathname.split('/').filter(Boolean)[0];
    if (!handle) {
      return '';
    }

    const reservedPaths = ['home', 'intent', 'share', 'i'];
    if (reservedPaths.includes(handle.toLowerCase())) {
      return '';
    }

    return handle.replace(/^@/, '');
  } catch {
    return '';
  }
};

const isTwitterLink = (link: StakingLink) => {
  const label = `${link.type || ''} ${link.name || ''}`.toLowerCase();
  return (
    label.includes('twitter') ||
    label.includes('x(') ||
    !!getTwitterHandleFromUrl(link.url)
  );
};

const getLinkDisplayText = (link: StakingLink) => {
  if (isTwitterLink(link)) {
    const handle = getTwitterHandleFromUrl(link.url);
    if (handle) {
      return `@${handle}`;
    }
  }

  return link.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

const getTokenAddress = (token?: StakingToken) => token?.id || '-';

const isLpPool = (pool: StakingPool) =>
  pool.type === 'univ2' || pool.type === 'univ3';

const getUptime = (pool: StakingPool, t: TFunction) => {
  if (!pool.create_at) {
    return '-';
  }

  const createAt =
    pool.create_at > 1000000000000
      ? dayjs(pool.create_at)
      : dayjs.unix(pool.create_at);
  const days = Math.max(dayjs().diff(createAt, 'day'), 0);
  return t('page.staking.about.days', { count: days });
};

const openPoolAddress = (pool: StakingPool) => {
  const chain = findChainByServerID(pool.chain_id);
  if (!chain?.scanLink || !pool.pool_address) {
    return;
  }
  openInTab(getAddressScanLink(chain.scanLink, pool.pool_address), false);
};

const openTokenAddress = (pool: StakingPool, token?: StakingToken) => {
  const chain = findChainByServerID(token?.chain_id || pool.chain_id);
  const address = getTokenAddress(token);
  if (!chain?.scanLink || !address || address === '-') {
    return;
  }
  openInTab(getAddressScanLink(chain.scanLink, address), false);
};

const AddressValue = ({
  value,
  onClick,
}: {
  value?: string | null;
  onClick?: () => void;
}) => (
  <button
    type="button"
    className="staking-link-value"
    disabled={!value || value === '-'}
    onClick={onClick}
  >
    <span>{shortenStakingAddress(value)}</span>
    {value && value !== '-' ? <ExternalIcon /> : null}
  </button>
);

const TokenInline = ({
  token,
  chainServerId,
}: {
  token?: StakingToken;
  chainServerId?: string;
}) => {
  if (!token) {
    return (
      <span className="text-[13px] leading-[20px] text-r-neutral-title1">
        -
      </span>
    );
  }

  return (
    <div className="flex items-center gap-[4px]">
      <TokenLogos tokens={[token]} chainServerId={chainServerId} size="mini" />
      <span className="text-[13px] leading-[20px] text-r-neutral-title1">
        {token.symbol || token.id}
      </span>
    </div>
  );
};

const FieldBlock = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <div className="text-[12px] leading-[14px] text-r-neutral-foot">
      {label}
    </div>
    <div className="mt-[2px] min-h-[20px]">{children}</div>
  </div>
);

const TokenAddressField = ({
  pool,
  token,
}: {
  pool: StakingPool;
  token?: StakingToken;
}) => (
  <AddressValue
    value={getTokenAddress(token)}
    onClick={() => openTokenAddress(pool, token)}
  />
);

const PoolInfoSection = ({ pool }: { pool: StakingPool }) => {
  const { t } = useTranslation();
  const token1 = pool.tokens.supplies[0];
  const token2 = pool.tokens.supplies[1];
  const lpPool = isLpPool(pool);

  return (
    <section className="px-[20px]">
      <div className="staking-section-title mb-[16px] text-[15px] leading-[18px] font-bold">
        {t('page.staking.about.pool')}
      </div>
      <div className="grid grid-cols-2 gap-x-[48px] gap-y-[16px]">
        <FieldBlock label={t('page.staking.about.poolAddress')}>
          <AddressValue
            value={pool.pool_address}
            onClick={() => openPoolAddress(pool)}
          />
        </FieldBlock>
        <FieldBlock label={t('page.staking.about.uptime')}>
          <div className="text-[13px] leading-[20px] text-r-neutral-title1">
            {getUptime(pool, t)}
          </div>
        </FieldBlock>
        <FieldBlock
          label={
            lpPool
              ? t('page.staking.about.token1')
              : t('page.staking.about.token')
          }
        >
          <TokenInline token={token1} chainServerId={pool.chain_id} />
        </FieldBlock>
        <FieldBlock
          label={
            lpPool
              ? t('page.staking.about.token1Address')
              : t('page.staking.about.tokenAddress')
          }
        >
          <TokenAddressField pool={pool} token={token1} />
        </FieldBlock>
        {lpPool ? (
          <>
            <FieldBlock label={t('page.staking.about.token2')}>
              <TokenInline token={token2} chainServerId={pool.chain_id} />
            </FieldBlock>
            <FieldBlock label={t('page.staking.about.token2Address')}>
              <TokenAddressField pool={pool} token={token2} />
            </FieldBlock>
          </>
        ) : null}
      </div>
    </section>
  );
};

const AboutProtocolSection = ({ pool }: { pool: StakingPool }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const description = pool.protocol.about?.description;
  const links = useMemo(() => getPoolLinks(pool, t), [pool, t]);
  const protocolName =
    pool.protocol.name || pool.protocol.id || t('page.staking.protocol');
  const collapsed = !!description && description.length > 150 && !expanded;

  return (
    <section className="px-[20px]">
      <div className="staking-section-title mb-[16px] text-[15px] leading-[18px] font-bold">
        {t('page.staking.about.aboutProtocol', { protocol: protocolName })}
      </div>
      <div
        className={clsx(
          'staking-about-desc text-[13px] leading-[20px] text-r-neutral-title1',
          collapsed && 'is-collapsed'
        )}
      >
        {description || t('page.staking.about.noDescription')}
      </div>
      {description && description.length > 150 ? (
        <button
          type="button"
          className="mt-[4px] text-[13px] leading-[16px] font-medium text-r-blue-default"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? t('page.staking.about.showLess')
            : t('page.staking.about.showMore')}
        </button>
      ) : null}
      {links.length ? (
        <div className="mt-[16px] grid grid-cols-2 gap-[16px]">
          {links.slice(0, 2).map((link) => (
            <div
              key={`${link.type || link.name || 'link'}-${link.url}`}
              className="min-w-0"
            >
              <div className="text-[12px] leading-[14px] text-r-neutral-foot">
                {link.name || link.type}
              </div>
              <button
                type="button"
                className="mt-[4px] flex max-w-full items-end gap-[4px] text-r-neutral-title1"
                onClick={() => openInTab(link.url, false)}
              >
                <ProtocolLogo protocol={pool.protocol} size={16} />
                <span className="truncate text-[13px] leading-[16px]">
                  {getLinkDisplayText(link)}
                </span>
                <span className="shrink-0 text-r-neutral-foot">
                  <ExternalIcon />
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export const AboutTab = ({ pool }: { pool: StakingPool }) => (
  <div className="staking-about-tab">
    <PoolInfoSection pool={pool} />
    <AboutProtocolSection pool={pool} />
  </div>
);
