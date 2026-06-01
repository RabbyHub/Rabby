import {
  formatStakingAuditDate,
  getStakingAuditFirmLogoUrl,
  getStakingSecurityAudits,
} from '@/ui/views/Staking/data/securityAudits';
import type { StakingPool } from '@/ui/views/Staking/types';

const createPool = (overrides: Partial<StakingPool>): StakingPool =>
  ({
    id: 'eth:0xpool',
    chain_id: 'eth',
    type: 'univ3',
    protocol: {
      id: 'uniswap3',
      name: 'Uniswap V3',
    },
    tokens: {
      supplies: [
        {
          id: '0xtoken0',
          symbol: 'USDC',
        },
        {
          id: '0xtoken1',
          symbol: 'WETH',
        },
      ],
      rewards: [],
    },
    metricLabel: 'APR',
    userPositionIndexes: [],
    ...overrides,
  } as StakingPool);

describe('staking security audits', () => {
  it('uses company-hosted audit firm logos', () => {
    expect(getStakingAuditFirmLogoUrl('Trail of Bits')).toBe(
      'https://static-assets.debank.com/files/6521a907-4f7f-413f-b50c-fc9de004ec37.png'
    );
    expect(getStakingAuditFirmLogoUrl('SlowMist')).toBe(
      'https://static-assets.debank.com/files/e9722bb9-0d62-46c4-b3e8-9802f88bf1dd.ico'
    );
    expect(getStakingAuditFirmLogoUrl('ChainSecurity')).toBe(
      'https://static-assets.debank.com/files/40bc446a-9adb-4961-ab52-f10e4704e93e.png'
    );
    expect(getStakingAuditFirmLogoUrl('PeckShield')).toBe(
      'https://static-assets.debank.com/files/7230e220-babd-43fb-bde3-8a5a6c7e255c.jpeg'
    );
    expect(getStakingAuditFirmLogoUrl('Cantina')).toBe(
      'https://static-assets.debank.com/files/7d0e43c5-053d-44c6-827f-19e0b60ae9ea.svg'
    );
    expect(getStakingAuditFirmLogoUrl('ABDK')).toBe(
      'https://static-assets.debank.com/files/b5e205ae-2916-4a2b-ae97-557756d340a5.png'
    );
    expect(getStakingAuditFirmLogoUrl('DappOrg')).toBe(
      'https://static-assets.debank.com/files/90a4ae32-c7d8-40a4-9839-7317eb4835c9.png'
    );
    expect(getStakingAuditFirmLogoUrl('Unknown')).toBe('');
  });

  it('uses protocol-version audits for all Uniswap V3 pairs', () => {
    const usdcEth = createPool({
      id: 'eth:0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
      protocol: {
        id: 'uniswap3',
      },
      tokens: {
        supplies: [
          {
            id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            symbol: 'USDC',
          },
          {
            id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            symbol: 'WETH',
          },
        ],
        rewards: [],
      },
    });
    const daiEth = createPool({
      id: 'eth:0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8',
      protocol: {
        id: 'uniswap3',
      },
      tokens: {
        supplies: [
          {
            id: '0x6b175474e89094c44da98b954eedeac495271d0f',
            symbol: 'DAI',
          },
          {
            id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            symbol: 'WETH',
          },
        ],
        rewards: [],
      },
    });

    expect(getStakingSecurityAudits(usdcEth)).toEqual(
      getStakingSecurityAudits(daiEth)
    );
    expect(
      getStakingSecurityAudits(usdcEth).map((audit) => audit.auditFirm)
    ).toEqual(['ABDK', 'ABDK', 'Trail of Bits']);
  });

  it('uses protocol-version audits for all PancakeSwap V2 pairs', () => {
    const cakeBnb = createPool({
      id: 'bsc:0xpool-a',
      chain_id: 'bsc',
      type: 'univ2',
      protocol: {
        id: 'pancakeswap',
      },
    });
    const usdtBnb = createPool({
      id: 'bsc:0xpool-b',
      chain_id: 'bsc',
      type: 'univ2',
      protocol: {
        id: 'pancakeswap',
      },
    });

    expect(getStakingSecurityAudits(cakeBnb)).toEqual(
      getStakingSecurityAudits(usdtBnb)
    );
    expect(getStakingSecurityAudits(cakeBnb)).toHaveLength(1);
    expect(getStakingSecurityAudits(cakeBnb)[0].auditFirm).toBe('SlowMist');
  });

  it('matches ERC4626 audits by vault address', () => {
    const pool = createPool({
      id: 'opaque-pool-id',
      type: 'erc4626',
      pool_address: '0x28B3a8fb53B741A8Fd78c0fb9A6B2393d896a43d',
      protocol: {
        id: 'spark',
      },
      tokens: {
        supplies: [
          {
            id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            symbol: 'USDC',
          },
        ],
        rewards: [],
      },
    });

    const audits = getStakingSecurityAudits(pool);

    expect(audits).toHaveLength(9);
    expect(audits[0].auditScope).toBe('Spark Vaults V2 Audit');
  });

  it('stores audit risk metadata as locale-neutral values', () => {
    const pool = createPool({
      id: 'opaque-pool-id',
      type: 'erc4626',
      pool_address: '0x83F20F44975D03b1b09e64809B757c47f942bEEA',
      protocol: {
        id: 'spark',
      },
      tokens: {
        supplies: [
          {
            id: '0x6b175474e89094c44da98b954eedeac495271d0f',
            symbol: 'DAI',
          },
        ],
        rewards: [],
      },
    });

    const audit = getStakingSecurityAudits(pool).find(
      (item) => item.auditScope === 'Savings DAI (sDAI)'
    );

    expect(audit).toMatchObject({
      auditScore: '87.57',
      riskLevel: 'low',
    });
  });

  it('formats audit dates as MM/YYYY', () => {
    expect(formatStakingAuditDate('Apr-23')).toBe('04/2023');
    expect(formatStakingAuditDate('Oct-25')).toBe('10/2025');
  });
});
