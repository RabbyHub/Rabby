// Sources: Uniswap/sdks current and pre-2.1.1 constants; universal-router/deploy-addresses.
// Scoped to rabby-swap's Uniswap SUPPORT_CHAINS. These entries do not grant router approval.
export type UniversalRouterVersion =
  | '1.0/1.1'
  | '1.2'
  | '2.0'
  | '2.1.0'
  | '2.1.1'
  | '2.1.2'
  | '2.2.0';

// An SDK version alias can refer to a deployment with an older command mask.
// zkSync's verified Commands.sol uses 0x1f, although the SDK lists it as 1.2/2.0.
type RouterDeployment =
  | UniversalRouterVersion
  | { version: UniversalRouterVersion; commandMask: number };

export const deployments: Record<number, Record<string, RouterDeployment>> = {
  '1': {
    '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': '1.0/1.1',
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
    '0x66a9893cc07d91d95644aedd05d03f95e1dba8af': '2.0',
    '0xd92a36b0000531ef3063ded4de20a0783308446c': '2.1.0',
    '0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca': '2.1.1',
    '0x23617e59a5925b2a4bf75d73ff6711cd0b29de85': '2.1.2',
    '0xab863e752bf67d8dcdd929eaae9be9dc83fb3bbb': '2.2.0',
  },
  '10': {
    '0xb555edf5dcf85f42ceef1f3630a52a108e55a654': '1.0/1.1',
    '0xcb1355ff08ab38bbce60111f1bb2b784be25d7e8': '1.2',
    '0xec8b0f7ffe3ae75d7ffab09429e3675bb63503e4': '1.2',
    '0x851116d9223fabed8e56c0e6b8ad0c31d98b3507': '2.0',
    '0xde20eee5398d3790a4d356e8925bd21ea65d99af': '2.1.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xc09255d86db563cbc11c2fcf4a0c512e160111b4': '2.1.2',
  },
  '56': {
    '0x5dc88340e1c5c6366864ee415d6034cadd1a9897': '1.0/1.1',
    '0x4dae2f939acf50408e13d58534ff8c2776d45265': '1.2',
    '0xec8b0f7ffe3ae75d7ffab09429e3675bb63503e4': '1.2',
    '0x1906c1d672b88cd1b9ac7593301ca990f94eae07': '2.0',
    '0x91bf3bfaef8d771a74e1a8fe460b3ee646b2e588': '2.1.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xdc264714f68d84cf29bc605589405e78bdbe7c9f': '2.1.2',
  },
  '130': {
    '0x4d73a4411ca1c660035e4aecc8270e5dddec8c17': '1.2',
    '0xef740bf23acae26f6492b10de645d6b98dc8eaf3': '2.0',
    '0xe6039ae5b44f90d56c6b029354fb22999861a9a0': '2.1.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0xd1b797d92d87b688193a2b976efc8d577d204343': '2.1.2',
  },
  '137': {
    '0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5': '1.0/1.1',
    '0xec7be89e9d109e7e3fec59c222cf297125fefda2': '1.2',
    '0x643770e279d5d0733f21d6dc03a8efbabf3255b4': '1.2',
    '0x1095692a6237d83c6a72f3f5efedb9a670c49223': '2.0',
    '0xe27610fd9dd05fc061366bc9da414ca6f948f204': '2.1.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xdc264714f68d84cf29bc605589405e78bdbe7c9f': '2.1.2',
  },
  '143': {
    '0x0d97dc33264bfc1c226207428a79b26757fb9dc3': '2.0',
    '0xbc2a036e5027b9ae57bba847ef88e1b14823f7b1': '2.1.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0xa6ce4f10d83dbddac17e68e1837ca9ce6a1b596e': '2.1.2',
  },
  '324': {
    '0x28731bcc616b5f51dd52cf2e4df0e78dd1136c06': {
      version: '1.2',
      commandMask: 0x1f,
    },
  },
  '4217': {
    '0x1febb76be10aaf3a1402f04e8e835f2c382f7914': '2.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0x182a927119d56008d921126764bf884221b10f59': '2.1.2',
  },
  '4663': {
    '0x8876789976decbfcbbbe364623c63652db8c0904': '2.1.1',
    '0x204faca1764b154221e35c0d20abb3c525710498': '2.1.2',
  },
  '5042': {
    '0x4fca4a51ab4f23a7447b3284fbd7d73289a89fb1': '2.1.1',
    '0x8702463e73f74d0b6765abceb314ef07acb92650': '2.1.2',
  },
  '8453': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
    '0xec8b0f7ffe3ae75d7ffab09429e3675bb63503e4': '1.2',
    '0x6ff5693b99212da76ad316178a184ab56d299b43': '2.0',
    '0xf3a4f4094bd2c6c06ca2f61789d8727b8d1e7259': '2.1.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0xd6145b2d3f379919e8cdeda7b97e37c4b2ca9c40': '2.1.2',
    '0xbe2257d1aafbe6b73f67a9ac971c2f0b344bb3c5': '2.2.0',
  },
  '42161': {
    '0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5': '1.0/1.1',
    '0x5e325eda8064b456f4781070c0738d849c824258': '1.2',
    '0xec8b0f7ffe3ae75d7ffab09429e3675bb63503e4': '1.2',
    '0xa51afafe0263b40edaef0df8781ea9aa03e381a3': '2.0',
    '0x96b2fd2f80e9428daa65d859653117d453981ab4': '2.1.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x2d01411773c8c24805306e89a41f7855c3c4fe65': '2.1.2',
  },
  '42220': {
    '0xc73d61d192fb994157168fb56730fdec64c9cb8f': '1.0/1.1',
    '0x643770e279d5d0733f21d6dc03a8efbabf3255b4': '1.2',
    '0xcb695bc5d3aa22cad1e6df07801b061a05a0233a': '2.0',
    '0xbb8ed9bf0bff210652ae5f473a849f82e990ddf6': '2.1.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xe2023f3fa515cf070e07fd9d51c1d236e07843f4': '2.1.2',
  },
  '43114': {
    '0x4dae2f939acf50408e13d58534ff8c2776d45265': '1.2',
    '0x82635af6146972cd6601161c4472ffe97237d292': '1.2',
    '0x94b75331ae8d42c1b61065089b7d48fe14aa73b7': '2.0',
    '0x0cf1f86b331a03179646341d10a2a87515087221': '2.1.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x661e93cca42afacb172121ef892830ca3b70f08d': '2.1.2',
  },
  '81457': {
    '0x643770e279d5d0733f21d6dc03a8efbabf3255b4': '1.2',
    '0xe463635f6e73c1e595554c3ae216472d0fb929a9': '1.2',
    '0xeabbcb3e8e415306207ef514f660a3f820025be3': '2.0',
    '0x77c0097c1acf6fd84878d3f7c0603e3f04e8bec7': '2.1.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x661e93cca42afacb172121ef892830ca3b70f08d': '2.1.2',
  },
};
