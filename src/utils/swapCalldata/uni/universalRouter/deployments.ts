// Official deployment snapshot: Uniswap/sdks, universal-router-sdk/src/utils/constants.ts.
// Addresses select a decoding format; this list does not grant router approval.
export type UniversalRouterVersion =
  | '1.2'
  | '2.0'
  | '2.1.1'
  | '2.1.2'
  | '2.2.0';

export const deployments: Record<
  number,
  Record<string, UniversalRouterVersion>
> = {
  '1': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
    '0x66a9893cc07d91d95644aedd05d03f95e1dba8af': '2.0',
    '0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca': '2.1.1',
    '0x23617e59a5925b2a4bf75d73ff6711cd0b29de85': '2.1.2',
    '0xab863e752bf67d8dcdd929eaae9be9dc83fb3bbb': '2.2.0',
  },
  '5': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
  },
  '10': {
    '0xcb1355ff08ab38bbce60111f1bb2b784be25d7e8': '1.2',
    '0x851116d9223fabed8e56c0e6b8ad0c31d98b3507': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xc09255d86db563cbc11c2fcf4a0c512e160111b4': '2.1.2',
  },
  '56': {
    '0x4dae2f939acf50408e13d58534ff8c2776d45265': '1.2',
    '0x1906c1d672b88cd1b9ac7593301ca990f94eae07': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xdc264714f68d84cf29bc605589405e78bdbe7c9f': '2.1.2',
  },
  '130': {
    '0x4d73a4411ca1c660035e4aecc8270e5dddec8c17': '1.2',
    '0xef740bf23acae26f6492b10de645d6b98dc8eaf3': '2.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0xd1b797d92d87b688193a2b976efc8d577d204343': '2.1.2',
  },
  '137': {
    '0xec7be89e9d109e7e3fec59c222cf297125fefda2': '1.2',
    '0x1095692a6237d83c6a72f3f5efedb9a670c49223': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xdc264714f68d84cf29bc605589405e78bdbe7c9f': '2.1.2',
  },
  '143': {
    '0x0d97dc33264bfc1c226207428a79b26757fb9dc3': '1.2',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0xa6ce4f10d83dbddac17e68e1837ca9ce6a1b596e': '2.1.2',
  },
  '196': {
    '0x5507749f2c558bb3e162c6e90c314c092e7372ff': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x1cd182c94fcf42277b80dbb9060f88024809e61e': '2.1.2',
  },
  '324': {
    '0x28731bcc616b5f51dd52cf2e4df0e78dd1136c06': '1.2',
  },
  '420': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
  },
  '480': {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': '1.2',
    '0x8ac7bee993bb44dab564ea4bc9ea67bf9eb5e743': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xf025e0fe9e331a0ef05c2ad3c4e9c64b625cda6f': '2.1.2',
  },
  '1301': {
    '0x8909dc15e40173ff4699343b6eb8132c65e18ec6': '1.2',
    '0xf70536b3bcc1bd1a972dc186a2cf84cc6da6be5d': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xdf38f24fe153761634be942f9d859f3dba857e95': '2.1.2',
  },
  '1868': {
    '0x0e2850543f69f678257266e0907ff9a58b3f13de': '1.2',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x661e93cca42afacb172121ef892830ca3b70f08d': '2.1.2',
  },
  '4217': {
    '0x1febb76be10aaf3a1402f04e8e835f2c382f7914': '2.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0x182a927119d56008d921126764bf884221b10f59': '2.1.2',
  },
  '4326': {
    '0x48fd03529d2a91be835f07f6b72f53b4aad6093d': '2.0',
    '0xaedd1cf4c14e833140a61e9c0d2b73a64795c823': '2.1.2',
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
    '0x6ff5693b99212da76ad316178a184ab56d299b43': '2.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0xd6145b2d3f379919e8cdeda7b97e37c4b2ca9c40': '2.1.2',
    '0xbe2257d1aafbe6b73f67a9ac971c2f0b344bb3c5': '2.2.0',
  },
  '10143': {
    '0x3ae6d8a282d67893e17aa70ebffb33ee5aa65893': '1.2',
  },
  '42161': {
    '0x5e325eda8064b456f4781070c0738d849c824258': '1.2',
    '0xa51afafe0263b40edaef0df8781ea9aa03e381a3': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x2d01411773c8c24805306e89a41f7855c3c4fe65': '2.1.2',
  },
  '42220': {
    '0x643770e279d5d0733f21d6dc03a8efbabf3255b4': '1.2',
    '0xcb695bc5d3aa22cad1e6df07801b061a05a0233a': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xe2023f3fa515cf070e07fd9d51c1d236e07843f4': '2.1.2',
  },
  '43114': {
    '0x4dae2f939acf50408e13d58534ff8c2776d45265': '1.2',
    '0x94b75331ae8d42c1b61065089b7d48fe14aa73b7': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x661e93cca42afacb172121ef892830ca3b70f08d': '2.1.2',
  },
  '44787': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
  },
  '57073': {
    '0x112908dac86e20e7241b0927479ea3bf935d1fa0': '2.0',
    '0x661e93cca42afacb172121ef892830ca3b70f08d': '2.1.2',
    '0x315e413a11ab0df498ef83873012430ca36638ae': '2.2.0',
  },
  '59144': {
    '0x661e93cca42afacb172121ef892830ca3b70f08d': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0xdc264714f68d84cf29bc605589405e78bdbe7c9f': '2.1.2',
  },
  '80001': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
  },
  '81457': {
    '0x643770e279d5d0733f21d6dc03a8efbabf3255b4': '1.2',
    '0xeabbcb3e8e415306207ef514f660a3f820025be3': '2.0',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x661e93cca42afacb172121ef892830ca3b70f08d': '2.1.2',
  },
  '84531': {
    '0xd0872d928672ae2ff74bdb2f5130ac12229cafaf': '1.2',
  },
  '84532': {
    '0x492e6456d9528771018deb9e87ef7750ef184104': '1.2',
    '0x8b844f885672f333bc0042cb669255f93a4c1e6b': '2.1.1',
    '0x8702463e73f74d0b6765abceb314ef07acb92650': '2.1.2',
  },
  '421613': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
  },
  '7777777': {
    '0x2986d9721a49838ab4297b695858af7f17f38014': '1.2',
    '0x3315ef7ca28db74abadc6c44570efdf06b04b020': '2.0',
    '0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7': '2.1.1',
    '0xf025e0fe9e331a0ef05c2ad3c4e9c64b625cda6f': '2.1.2',
  },
  '11155111': {
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': '1.2',
    '0x3a9d48ab9751398bbfa63ad67599bb04e4bdf98b': '2.0',
    '0x7dfd4f31be6814d2906bde155c3e1b146eac1468': '2.1.1',
    '0x7e4f6c5e954da5c61b3423d81e2277431ac043f3': '2.1.2',
    '0x5093f1cded83d99ffed6602da6260672ae16787c': '2.2.0',
  },
};
