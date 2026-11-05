// Fee-approval signature samples for extra fee protection tests.
// All non-zero fee. Addresses are test addresses.

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BUILDER = '0x1111111111111111111111111111111111111111';
const USER = '0x2222222222222222222222222222222222222222';
const EIP712_DOMAIN_NO_CONTRACT = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
];

// SDK-derived, not captured from site (hyperliquid-python-sdk signing.py)
export const hyperliquidApproveBuilderFee: Record<string, any> = {
  domain: {
    name: 'HyperliquidSignTransaction',
    version: '1',
    chainId: 42161,
    verifyingContract: ZERO_ADDRESS,
  },
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    'HyperliquidTransaction:ApproveBuilderFee': [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'maxFeeRate', type: 'string' },
      { name: 'builder', type: 'address' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
  primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
  message: {
    type: 'approveBuilderFee',
    signatureChainId: '0xa4b1',
    hyperliquidChain: 'Mainnet',
    maxFeeRate: '0.1%',
    builder: BUILDER,
    nonce: 1761465600000,
  },
};

const asterDomain = {
  name: 'AsterSignTransaction',
  version: '1',
  chainId: 1666,
  verifyingContract: ZERO_ADDRESS,
};

const asterDomainType = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

// SDK-derived, matches aster-api-website docs/asterCode/spot-authentication.md
export const asterApproveBuilder: Record<string, any> = {
  domain: asterDomain,
  types: {
    EIP712Domain: asterDomainType,
    ApproveBuilder: [
      { name: 'Builder', type: 'string' },
      { name: 'MaxFeeRate', type: 'string' },
      { name: 'BuilderName', type: 'string' },
      { name: 'AsterChain', type: 'string' },
      { name: 'User', type: 'string' },
      { name: 'Nonce', type: 'uint256' },
    ],
  },
  primaryType: 'ApproveBuilder',
  message: {
    Builder: BUILDER,
    MaxFeeRate: '0.001',
    BuilderName: 'builder',
    AsterChain: 'Mainnet',
    User: USER,
    Nonce: 1761465600000000,
  },
};

// SDK-derived, not captured from site (asterdex/api-docs demo/aster-code.py)
export const asterApproveAgentWithBuilder: Record<string, any> = {
  domain: asterDomain,
  types: {
    EIP712Domain: asterDomainType,
    ApproveAgent: [
      { name: 'AgentName', type: 'string' },
      { name: 'AgentAddress', type: 'string' },
      { name: 'IpWhitelist', type: 'string' },
      { name: 'Expired', type: 'uint256' },
      { name: 'CanSpotTrade', type: 'bool' },
      { name: 'CanPerpTrade', type: 'bool' },
      { name: 'CanWithdraw', type: 'bool' },
      { name: 'Builder', type: 'string' },
      { name: 'MaxFeeRate', type: 'string' },
      { name: 'BuilderName', type: 'string' },
      { name: 'AsterChain', type: 'string' },
      { name: 'User', type: 'string' },
      { name: 'Nonce', type: 'uint256' },
    ],
  },
  primaryType: 'ApproveAgent',
  message: {
    AgentName: 'agent',
    AgentAddress: '0x3333333333333333333333333333333333333333',
    IpWhitelist: '',
    Expired: 1793001600000,
    CanSpotTrade: true,
    CanPerpTrade: true,
    CanWithdraw: false,
    Builder: BUILDER,
    MaxFeeRate: '0.001',
    BuilderName: 'builder',
    AsterChain: 'Mainnet',
    User: USER,
    Nonce: 1761465600000000,
  },
};

// Docs-derived (aster-api-website docs/asterCode/endpoints.md approveAgent):
// spotBuilder / spotBuilderName / maxFeeRate, Title Case in typed data.
export const asterApproveAgentWithSpotBuilder: Record<string, any> = {
  domain: asterDomain,
  types: {
    EIP712Domain: asterDomainType,
    ApproveAgent: [
      { name: 'AgentName', type: 'string' },
      { name: 'AgentAddress', type: 'string' },
      { name: 'IpWhitelist', type: 'string' },
      { name: 'Expired', type: 'uint256' },
      { name: 'CanSpotTrade', type: 'bool' },
      { name: 'CanPerpTrade', type: 'bool' },
      { name: 'CanWithdraw', type: 'bool' },
      { name: 'MaxFeeRate', type: 'string' },
      { name: 'SpotBuilder', type: 'string' },
      { name: 'SpotBuilderName', type: 'string' },
      { name: 'AsterChain', type: 'string' },
      { name: 'User', type: 'string' },
      { name: 'Nonce', type: 'uint256' },
    ],
  },
  primaryType: 'ApproveAgent',
  message: {
    AgentName: 'agent',
    AgentAddress: '0x3333333333333333333333333333333333333333',
    IpWhitelist: '',
    Expired: 1793001600000,
    CanSpotTrade: true,
    CanPerpTrade: false,
    CanWithdraw: false,
    MaxFeeRate: '0.01',
    SpotBuilder: BUILDER,
    SpotBuilderName: 'builder',
    AsterChain: 'Mainnet',
    User: USER,
    Nonce: 1761465600000000,
  },
};

// Captured from the official Lighter frontend (2026-10-26); account index and
// nonce replaced. The integrator is Lighter's fee collector, fees are the
// systemConfig maximums.
export const lighterOfficialApproveIntegratorText = [
  'Approve Integrator',
  '',
  'nonce: 0x0000000000000001',
  'account index: 0x0000000000000abc',
  'api key index: 0x0000000000000000',
  'integrator account index: 0x0000fffffffcbb5c',
  'max perps taker fee: 0x00000000000003e8',
  'max perps maker fee: 0x00000000000003e8',
  'max spot taker fee: 0x0000000000002710',
  'max spot maker fee: 0x0000000000002710',
  'approval expiry: 0x000001a8d41145a1',
  'chainId: 0x0000000000000130',
  'Only sign this message for a trusted client!',
].join('\n');

// SDK-derived, not captured from site (lighter-go TemplateL2ApproveIntegrator)
export const lighterApproveIntegratorText = [
  'Approve Integrator',
  '',
  'nonce: 0x0000000000000001',
  'account index: 0x0000000000000abc',
  'api key index: 0x0000000000000002',
  'integrator account index: 0x0000000000000def',
  'max perps taker fee: 0x00000000000003e8',
  'max perps maker fee: 0x00000000000003e8',
  'max spot taker fee: 0x0000000000002710',
  'max spot maker fee: 0x0000000000002710',
  'approval expiry: 0x0000019a5c3e8000',
  'chainId: 0x0000000000000130',
  'Only sign this message for a trusted client!',
].join('\n');

// Shapes follow the injector's own signing code (not captured from the
// official frontends). Builders are test values.
export const aevoApproveBuilder: Record<string, any> = {
  types: {
    EIP712Domain: EIP712_DOMAIN_NO_CONTRACT,
    ApproveBuilder: [
      { name: 'account', type: 'address' },
      { name: 'builderId', type: 'string' },
      { name: 'maxFeeRate', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  },
  primaryType: 'ApproveBuilder',
  domain: { name: 'Aevo Mainnet', version: '1', chainId: 1 },
  message: {
    account: USER,
    builderId: 'builder_0000000000000001',
    maxFeeRate: '500',
    nonce: '1700000000000',
  },
};

export const grvtAuthorizeBuilder: Record<string, any> = {
  types: {
    EIP712Domain: EIP712_DOMAIN_NO_CONTRACT,
    AuthorizeBuilder: [
      { name: 'mainAccountID', type: 'address' },
      { name: 'builderAccountID', type: 'address' },
      { name: 'maxFutureFeeRate', type: 'uint32' },
      { name: 'maxSpotFeeRate', type: 'uint32' },
      { name: 'nonce', type: 'uint32' },
      { name: 'expiration', type: 'int64' },
    ],
  },
  primaryType: 'AuthorizeBuilder',
  domain: { name: 'GRVT Exchange', version: '0', chainId: 325 },
  message: {
    mainAccountID: USER,
    builderAccountID: BUILDER,
    maxFutureFeeRate: 1000,
    maxSpotFeeRate: 1000,
    nonce: 1,
    expiration: '1800000000000000000',
  },
};

export const sodexApproveBuilderFee: Record<string, any> = {
  types: {
    EIP712Domain: [
      ...EIP712_DOMAIN_NO_CONTRACT,
      { name: 'verifyingContract', type: 'address' },
    ],
    ApproveBuilderFeeAction: [
      { name: 'chainID', type: 'uint64' },
      { name: 'nonce', type: 'uint64' },
      { name: 'accountID', type: 'uint64' },
      { name: 'builderID', type: 'uint64' },
      { name: 'maxFeeRate', type: 'uint64' },
    ],
  },
  primaryType: 'ApproveBuilderFeeAction',
  domain: {
    name: 'universal',
    version: '1',
    chainId: 1,
    verifyingContract: ZERO_ADDRESS,
  },
  message: {
    chainID: '286623',
    nonce: '1',
    accountID: '42',
    builderID: '1',
    maxFeeRate: '2000',
  },
};
