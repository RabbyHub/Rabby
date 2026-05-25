import type { StakingPool } from '../types';

export interface StakingSecurityAudit {
  auditFirm: string;
  auditDate: string;
  auditScope: string;
  auditReportUrl: string;
  certikScore?: string;
  certikLevel?: string;
}

const AUDIT_DATE_ORDER: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

const createAudit = (
  auditFirm: string,
  auditDate: string,
  auditScope: string,
  auditReportUrl: string,
  certikScore?: string,
  certikLevel?: string
): StakingSecurityAudit => ({
  auditFirm,
  auditDate,
  auditScope,
  auditReportUrl,
  certikScore,
  certikLevel,
});

const SHARED_SPARK_V2_AUDITS: StakingSecurityAudit[] = [
  createAudit(
    'ChainSecurity',
    'Oct-25',
    'Spark Vaults V2 Audit',
    'https://reports.chainsecurity.com/Spark/ChainSecurity_Spark_SparkVaultsV2_Audit.pdf'
  ),
  createAudit(
    'ChainSecurity',
    'Apr-23',
    'DAI IR Strategy and sDAI Oracle',
    'https://docs.spark.fi/assets/Chainsecurity-DAI-IR-Strategy-and-sDAI-Oracle.pdf',
    '87.57',
    '低风险'
  ),
  createAudit(
    'ChainSecurity',
    'Apr-23',
    'Savings DAI (sDAI)',
    'https://docs.spark.fi/assets/Chainsecurity-sDAI.pdf',
    '87.57',
    '低风险'
  ),
  createAudit(
    'ChainSecurity',
    'Apr-23',
    'SparkLend Deployment Verification',
    'https://docs.spark.fi/assets/Chainsecurity-SparkLend-Deployment-Verification.pdf',
    '87.57',
    '低风险'
  ),
  createAudit(
    'Cantina',
    'Oct-24',
    'Spark Liquidity Layer',
    'https://docs.spark.fi/assets/Cantina-Spark-Liquidity-Layer-2024-10-23.pdf',
    '87.57',
    '低风险'
  ),
  createAudit(
    'ChainSecurity',
    'Oct-24',
    'Spark Liquidity Layer',
    'https://docs.spark.fi/assets/Chainsecurity-Spark-Liquidity-Layer-2024-10-22.pdf',
    '87.57',
    '低风险'
  ),
  createAudit(
    'Cantina',
    'Sep-24',
    'Savings USDS (sUSDS)',
    'https://docs.spark.fi/assets/Cantina-sUSDS.pdf',
    '87.57',
    '低风险'
  ),
  createAudit(
    'Cantina',
    'Sep-24',
    'Spark Liquidity Layer',
    'https://docs.spark.fi/assets/Cantina-Spark-Liquidity-Layer-2024-09-25.pdf',
    '87.57',
    '低风险'
  ),
  createAudit(
    'ChainSecurity',
    'Sep-24',
    'Savings USDS (sUSDS)',
    'https://docs.spark.fi/assets/Chainsecurity-sUSDS.pdf',
    '87.57',
    '低风险'
  ),
];

const AUDITS_BY_POOL_KEY: Record<string, StakingSecurityAudit[]> = {
  'erc4626-eth-sdai': [
    createAudit(
      'ChainSecurity',
      'Apr-23',
      'DAI IR Strategy and sDAI Oracle',
      'https://docs.spark.fi/assets/Chainsecurity-DAI-IR-Strategy-and-sDAI-Oracle.pdf',
      '87.57',
      '低风险'
    ),
    createAudit(
      'ChainSecurity',
      'Apr-23',
      'Savings DAI (sDAI)',
      'https://docs.spark.fi/assets/Chainsecurity-sDAI.pdf',
      '87.57',
      '低风险'
    ),
  ],
  'erc4626-eth-susds': [
    createAudit(
      'Cantina',
      'Sep-24',
      'Savings USDS (sUSDS)',
      'https://docs.spark.fi/assets/Cantina-sUSDS.pdf',
      '87.57',
      '低风险'
    ),
    createAudit(
      'ChainSecurity',
      'Sep-24',
      'Savings USDS (sUSDS)',
      'https://docs.spark.fi/assets/Chainsecurity-sUSDS.pdf',
      '87.57',
      '低风险'
    ),
  ],
  'erc4626-eth-speth': SHARED_SPARK_V2_AUDITS,
  'erc4626-eth-sppyusd': [
    createAudit(
      'ChainSecurity',
      'Oct-25',
      'Spark Vaults V2 Audit',
      'https://reports.chainsecurity.com/Spark/ChainSecurity_Spark_SparkVaultsV2_Audit.pdf'
    ),
  ],
  'erc4626-eth-spusdc': SHARED_SPARK_V2_AUDITS,
  'erc4626-eth-spusdt': SHARED_SPARK_V2_AUDITS,
};

const ERC4626_AUDIT_KEY_BY_VAULT_ADDRESS: Record<string, string> = {
  '0x83f20f44975d03b1b09e64809b757c47f942beea': 'erc4626-eth-sdai',
  '0xa3931d71877c0e7a3148cb7eb4463524fec27fbd': 'erc4626-eth-susds',
  '0xfe6eb3b609a7c8352a241f7f3a21cea4e9209b8f': 'erc4626-eth-speth',
  '0x80128dbb9f07b93dde62a6daeadb69ed14a7d354': 'erc4626-eth-sppyusd',
  '0x28b3a8fb53b741a8fd78c0fb9a6b2393d896a43d': 'erc4626-eth-spusdc',
  '0xe2e7a17dff93280dec073c995595155283e3c372': 'erc4626-eth-spusdt',
};

const AUDITS_BY_PROTOCOL_ID: Record<string, StakingSecurityAudit[]> = {
  uniswap2: [
    createAudit(
      'DappOrg',
      'Jun-20',
      'Uniswap V2 Audit Report',
      'https://dapp.org.uk/reports/uniswapv2.html'
    ),
  ],
  uniswap3: [
    createAudit(
      'ABDK',
      'Mar-21',
      'Uniswap V3 Core Audit Report',
      'https://github.com/Uniswap/v3-core/blob/main/audits/abdk/audit.pdf'
    ),
    createAudit(
      'Trail of Bits',
      'Mar-21',
      'Uniswap V3 Core Audit Report',
      'https://github.com/Uniswap/v3-core/blob/main/audits/tob/audit.pdf'
    ),
    createAudit(
      'ABDK',
      'Apr-21',
      'Uniswap V3 Periphery Audit Report',
      'https://github.com/Uniswap/v3-periphery/blob/main/audits/abdk/audit.pdf'
    ),
  ],
  pancakeswap: [
    createAudit(
      'SlowMist',
      'May-21',
      'PancakeSwap Factory and PancakeSwap Router',
      'https://github.com/slowmist/Knowledge-Base/blob/master/open-report/Smart%20Contract%20Security%20Audit%20Report%20%20-%20PancakeSwap.pdf'
    ),
  ],
  pancakeswap3: [
    createAudit(
      'PeckShield',
      'Mar-23',
      'PancakeSwap Exchange V3',
      'https://github.com/peckshield/publications/blob/master/audit_reports/PeckShield-Audit-Report-PancakeSwapV3-v1.0.pdf'
    ),
    createAudit(
      'SlowMist',
      'Mar-23',
      'PancakeSwap Exchange V3',
      'https://github.com/slowmist/Knowledge-Base/blob/master/open-report-V2/smart-contract/SlowMist%20Audit%20Report%20-%20PancakeSwap_v3_en-us.pdf'
    ),
  ],
};

const normalizeKey = (value?: string | null) => value?.trim().toLowerCase();

const getAuditDateValue = (auditDate: string) => {
  const [month, year] = auditDate.split('-');
  const monthValue = AUDIT_DATE_ORDER[month] || 0;
  const yearValue = Number(year);

  if (!yearValue || !monthValue) {
    return 0;
  }

  const fullYear = yearValue < 100 ? 2000 + yearValue : yearValue;
  return fullYear * 12 + monthValue;
};

const sortAudits = (audits: StakingSecurityAudit[]) =>
  [...audits].sort(
    (left, right) =>
      getAuditDateValue(right.auditDate) - getAuditDateValue(left.auditDate) ||
      left.auditFirm.localeCompare(right.auditFirm)
  );

const dedupeAudits = (audits: StakingSecurityAudit[]) => {
  const seen = new Set<string>();
  return audits.filter((audit) => {
    const key = audit.auditReportUrl.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getErc4626AuditKey = (pool: StakingPool) => {
  const poolId = normalizeKey(pool.id);
  if (poolId && AUDITS_BY_POOL_KEY[poolId]) {
    return poolId;
  }

  const vaultAddress = normalizeKey(pool.pool_address);
  if (vaultAddress && ERC4626_AUDIT_KEY_BY_VAULT_ADDRESS[vaultAddress]) {
    return ERC4626_AUDIT_KEY_BY_VAULT_ADDRESS[vaultAddress];
  }

  const supplySymbol = normalizeKey(pool.tokens.supplies[0]?.symbol);
  const chainId = normalizeKey(pool.chain_id);
  const symbolKey = supplySymbol
    ? `erc4626-${chainId}-${supplySymbol}`.toLowerCase()
    : undefined;

  if (symbolKey && AUDITS_BY_POOL_KEY[symbolKey]) {
    return symbolKey;
  }

  return undefined;
};

export const formatStakingAuditDate = (auditDate: string) => {
  const [month, year] = auditDate.split('-');
  const monthValue = AUDIT_DATE_ORDER[month];
  const yearValue = Number(year);

  if (!monthValue || !yearValue) {
    return auditDate;
  }

  const fullYear = yearValue < 100 ? 2000 + yearValue : yearValue;
  return `${String(monthValue).padStart(2, '0')}/${fullYear}`;
};

export const getStakingSecurityAudits = (pool: StakingPool) => {
  const audits =
    pool.type === 'erc4626'
      ? AUDITS_BY_POOL_KEY[getErc4626AuditKey(pool) || ''] || []
      : AUDITS_BY_PROTOCOL_ID[normalizeKey(pool.protocol.id) || ''] || [];

  return sortAudits(dedupeAudits(audits));
};
