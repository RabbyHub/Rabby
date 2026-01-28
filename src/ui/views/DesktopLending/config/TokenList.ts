import { API_ETH_MOCK_ADDRESS } from '@aave/contract-helpers';

type ExtensionValue = string | number | boolean | null | undefined;

export interface TokenInfo {
  readonly chainId: number;
  readonly address: string;
  readonly name: string;
  readonly decimals: number;
  readonly symbol: string;
  readonly logoURI?: string;
  readonly tags?: string[];
  readonly extensions?: {
    readonly [key: string]:
      | {
          [key: string]:
            | {
                [key: string]: ExtensionValue;
              }
            | ExtensionValue;
        }
      | ExtensionValue;
  };
}

export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface Tags {
  readonly [tagId: string]: {
    readonly name: string;
    readonly description: string;
  };
}

export interface TokenList {
  readonly name: string;
  readonly timestamp: string;
  readonly version: Version;
  readonly tokens: TokenInfo[];
  readonly tokenMap?: {
    readonly [key: string]: TokenInfo;
  };
  readonly keywords?: string[];
  readonly tags?: Tags;
  readonly logoURI?: string;
}

const NETWORK_ASSETS: TokenInfo[] = [
  {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 1,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    extensions: {
      isNative: true,
    },
  },
  // Sepolia
  {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 11155111,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 43114,
    logoURI:
      'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png?1696512369',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 137,
    logoURI:
      'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?1624446912',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'xDAI',
    symbol: 'xDAI',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 100,
    logoURI:
      'https://assets.coingecko.com/coins/images/11062/standard/Identity-Primary-DarkBG.png?1696511004',
    extensions: {
      isNative: true,
    },
  },
  // NOTE L2 ETH
  {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 8453, // base
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 10, // optimis
    // logoURI: 'https://ethereum-optimism.github.io/data/OP/logo.png',
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 42161, // Arb
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 56, //bnb
    logoURI:
      'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'S',
    symbol: 'S',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: 146,
    logoURI:
      'https://assets.coingecko.com/coins/images/38108/standard/200x200_Sonic_Logo.png?1734679256',
    extensions: {
      isNative: true,
    },
  },
];

export const TOKEN_LIST: TokenList = {
  name: 'Aave Labs Default',
  timestamp: '2024-01-22T15:47:25.037Z',
  version: {
    major: 11,
    minor: 12,
    patch: 0,
  },
  tags: {},
  logoURI: 'ipfs://QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir',
  keywords: ['aave', 'default'],
  tokens: [
    ...NETWORK_ASSETS,
    {
      chainId: 1,
      address: '0x111111111117dC0aa78b770fA6A738034120C302',
      name: '1inch',
      symbol: '1INCH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xAd42D013ac31486B73b6b059e748172994736426',
          },
          '56': {
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
          },
          '137': {
            tokenAddress: '0x9c2C5fd7b07E95EE044DDeba0E97a665F142394f',
          },
          '8453': {
            tokenAddress: '0xc5fecC3a29Fb57B5024eEc8a2239d4621e111CBE',
          },
          '42161': {
            tokenAddress: '0x6314C31A7a1652cE482cffe247E9CB7c3f4BB9aF',
          },
          '43114': {
            tokenAddress: '0xd501281565bf7789224523144Fe5D98e8B28f267',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      name: 'Aave',
      symbol: 'AAVE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
          },
          '56': {
            tokenAddress: '0xfb6115445Bff7b52FeB98650C87f44907E58f802',
          },
          '137': {
            tokenAddress: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
          },
          '42161': {
            tokenAddress: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
          },
          '43114': {
            tokenAddress: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9',
          },
        },
      },
    },
    {
      name: 'Liquid staked Ether 2.0',
      address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      symbol: 'stETH',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/13442/standard/steth_logo.png?1696513206',
    },
    {
      name: 'Wrapped liquid staked Ether 2.0',
      address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
      symbol: 'wstETH',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/18834/standard/wstETH.png?1696518295',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
          },
          '8453': {
            tokenAddress: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
          },
          '42161': {
            tokenAddress: '0x5979D7b546E38E414F7E9822514be443A4800529',
          },
        },
      },
    },
    {
      name: 'Wrapped liquid staked Ether 2.0',
      address: '0x5979D7b546E38E414F7E9822514be443A4800529',
      symbol: 'wstETH',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://assets.coingecko.com/coins/images/18834/standard/wstETH.png?1696518295',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
          },
          '10': {
            tokenAddress: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
          },
          '137': {
            tokenAddress: '0x03b54a6e9a984069379fae1a4fc4dbae93b3bccd',
          },
          '8453': {
            tokenAddress: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
          },
        },
      },
    },
    {
      name: 'Wrapped liquid staked Ether 2.0',
      address: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
      symbol: 'wstETH',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://assets.coingecko.com/coins/images/18834/standard/wstETH.png?1696518295',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
          },
          '137': {
            tokenAddress: '0x03b54a6e9a984069379fae1a4fc4dbae93b3bccd',
          },
          '8453': {
            tokenAddress: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
          },
          '42161': {
            tokenAddress: '0x5979D7b546E38E414F7E9822514be443A4800529',
          },
        },
      },
    },
    {
      name: 'Wrapped liquid staked Ether 2.0',
      address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
      symbol: 'wstETH',
      decimals: 18,
      chainId: 8453,
      logoURI:
        'https://assets.coingecko.com/coins/images/18834/standard/wstETH.png?1696518295',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
          },
          '10': {
            tokenAddress: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
          },
          '137': {
            tokenAddress: '0x03b54a6e9a984069379fae1a4fc4dbae93b3bccd',
          },
          '42161': {
            tokenAddress: '0x5979D7b546E38E414F7E9822514be443A4800529',
          },
        },
      },
    },
    {
      name: 'Wrapped liquid staked Ether 2.0',
      address: '0x03b54a6e9a984069379fae1a4fc4dbae93b3bccd',
      symbol: 'wstETH',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://assets.coingecko.com/coins/images/18834/standard/wstETH.png?1696518295',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
          },
          '10': {
            tokenAddress: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
          },
          '8453': {
            tokenAddress: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
          },
          '42161': {
            tokenAddress: '0x5979D7b546E38E414F7E9822514be443A4800529',
          },
        },
      },
    },
    {
      name: 'Rocket Pool ETH',
      address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
      symbol: 'rETH',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/20764/standard/reth.png?1696520159',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x9bcef72be871e61ed4fbbc7630889bee758eb81d',
          },
          '137': {
            tokenAddress: '0x0266f4f08d82372cf0fcbccc0ff74309089c74d1',
          },
          '8453': {
            tokenAddress: '0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c',
          },
          '42161': {
            tokenAddress: '0xec70dcb4a1efa46b8f2d97c310c9c4790ba5ffa8',
          },
        },
      },
    },
    {
      name: 'Rocket Pool ETH',
      address: '0x9bcef72be871e61ed4fbbc7630889bee758eb81d',
      symbol: 'rETH',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://assets.coingecko.com/coins/images/20764/standard/reth.png?1696520159',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
          },
          '137': {
            tokenAddress: '0x0266f4f08d82372cf0fcbccc0ff74309089c74d1',
          },
          '8453': {
            tokenAddress: '0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c',
          },
          '42161': {
            tokenAddress: '0xec70dcb4a1efa46b8f2d97c310c9c4790ba5ffa8',
          },
        },
      },
    },
    {
      name: 'Rocket Pool ETH',
      address: '0x0266f4f08d82372cf0fcbccc0ff74309089c74d1',
      symbol: 'rETH',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://assets.coingecko.com/coins/images/20764/standard/reth.png?1696520159',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
          },
          '10': {
            tokenAddress: '0x9bcef72be871e61ed4fbbc7630889bee758eb81d',
          },
          '8453': {
            tokenAddress: '0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c',
          },
          '42161': {
            tokenAddress: '0xec70dcb4a1efa46b8f2d97c310c9c4790ba5ffa8',
          },
        },
      },
    },
    {
      name: 'Rocket Pool ETH',
      address: '0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c',
      symbol: 'rETH',
      decimals: 18,
      chainId: 8453,
      logoURI:
        'https://assets.coingecko.com/coins/images/20764/standard/reth.png?1696520159',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
          },
          '10': {
            tokenAddress: '0x9bcef72be871e61ed4fbbc7630889bee758eb81d',
          },
          '137': {
            tokenAddress: '0x0266f4f08d82372cf0fcbccc0ff74309089c74d1',
          },
          '42161': {
            tokenAddress: '0xec70dcb4a1efa46b8f2d97c310c9c4790ba5ffa8',
          },
        },
      },
    },
    {
      name: 'Rocket Pool ETH',
      address: '0xec70dcb4a1efa46b8f2d97c310c9c4790ba5ffa8',
      symbol: 'rETH',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://assets.coingecko.com/coins/images/20764/standard/reth.png?1696520159',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
          },
          '10': {
            tokenAddress: '0x9bcef72be871e61ed4fbbc7630889bee758eb81d',
          },
          '137': {
            tokenAddress: '0x0266f4f08d82372cf0fcbccc0ff74309089c74d1',
          },
          '8453': {
            tokenAddress: '0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xB98d4C97425d9908E66E53A6fDf673ACcA0BE986',
      name: 'Arcblock',
      symbol: 'ABT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2341/thumb/arcblock.png?1547036543',
    },
    {
      chainId: 1,
      address: '0xEd04915c23f00A313a544955524EB7DBD823143d',
      name: 'Alchemy Pay',
      symbol: 'ACH',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/12390/thumb/ACH_%281%29.png?1599691266',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xBc7d6B50616989655AfD682fb42743507003056D',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xADE00C28244d5CE17D72E40330B1c318cD12B7c3',
      name: 'Ambire AdEx',
      symbol: 'ADX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/847/thumb/Ambire_AdEx_Symbol_color.png?1655432540',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x6bfF4Fb161347ad7de4A625AE5aa3A1CA7077819',
          },
          '137': {
            tokenAddress: '0xdDa7b23D2D72746663E7939743f929a3d85FC975',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x91Af0fBB28ABA7E31403Cb457106Ce79397FD4E6',
      name: 'Aergo',
      symbol: 'AERGO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4490/thumb/aergo.png?1647696770',
    },
    {
      chainId: 1,
      address: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
      name: 'agEur',
      symbol: 'agEUR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19479/standard/agEUR.png?1696518915',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x12f31B73D812C6Bb0d735a218c086d44D5fe5f89',
          },
          '137': {
            tokenAddress: '0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4',
          },
          '42161': {
            tokenAddress: '0xFA5Ed56A203466CbBC2430a43c66b9D8723528E7',
          },
          '43114': {
            tokenAddress: '0xAEC8318a9a59bAEb39861d10ff6C7f7bf1F96C57',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x32353A6C91143bfd6C7d363B546e62a9A2489A20',
      name: 'Adventure Gold',
      symbol: 'AGLD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18125/thumb/lpgblc4h_400x400.jpg?1630570955',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x6a6bD53d677F8632631662C48bD47b1D4D6524ee',
          },
          '42161': {
            tokenAddress: '0xb7910E8b16e63EFD51d5D1a093d56280012A3B9C',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x626E8036dEB333b408Be468F951bdB42433cBF18',
      name: 'AIOZ Network',
      symbol: 'AIOZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14631/thumb/aioz_logo.png?1617413126',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x33d08D8C7a168333a85285a68C0042b39fC3741D',
          },
          '137': {
            tokenAddress: '0xe2341718c6C0CbFa8e6686102DD8FbF4047a9e9B',
          },
          '42161': {
            tokenAddress: '0xeC76E8fe6e2242e6c2117caA244B9e2DE1569923',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF',
      name: 'Alchemix',
      symbol: 'ALCX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14113/thumb/Alchemix.png?1614409874',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x95c300e7740D2A88a44124B424bFC1cB2F9c3b89',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x27702a26126e0B3702af63Ee09aC4d1A084EF628',
      name: 'Aleph im',
      symbol: 'ALEPH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11676/thumb/Monochram-aleph.png?1608483725',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x82D2f8E02Afb160Dd5A480a617692e62de9038C4',
          },
          '137': {
            tokenAddress: '0x82dCf1Df86AdA26b2dCd9ba6334CeDb8c2448e9e',
          },
          '42161': {
            tokenAddress: '0xe7dcD50836d0A28c959c72D72122fEDB8E245A6C',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6B0b3a982b4634aC68dD83a4DBF02311cE324181',
      name: 'Alethea Artificial Liquid Intelligence',
      symbol: 'ALI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22062/thumb/alethea-logo-transparent-colored.png?1642748848',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xbFc70507384047Aa74c29Cdc8c5Cb88D0f7213AC',
          },
          '8453': {
            tokenAddress: '0x97c806e7665d3AFd84A8Fe1837921403D59F3Dcc',
          },
          '42161': {
            tokenAddress: '0xeF6124368c0B56556667e0de77eA008DfC0a71d1',
          },
          '84531': {
            tokenAddress: '0xC6729C6cFc6B872acF641EB3EA628C9F038e5ABb',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xAC51066d7bEC65Dc4589368da368b212745d63E8',
      name: 'My Neighbor Alice',
      symbol: 'ALICE',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/14375/thumb/alice_logo.jpg?1615782968',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xAC51066d7bEC65Dc4589368da368b212745d63E8',
          },
          '137': {
            tokenAddress: '0x50858d870FAF55da2fD90FB6DF7c34b5648305C6',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xa1faa113cbE53436Df28FF0aEe54275c13B40975',
      name: 'Alpha Venture DAO',
      symbol: 'ALPHA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12738/thumb/AlphaToken_256x256.png?1617160876',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xa1faa113cbE53436Df28FF0aEe54275c13B40975',
          },
          '137': {
            tokenAddress: '0x3AE490db48d74B1bC626400135d4616377D0109f',
          },
          '42161': {
            tokenAddress: '0xC9CBf102c73fb77Ec14f8B4C8bd88e050a6b2646',
          },
          '43114': {
            tokenAddress: '0x2147EFFF675e4A4eE1C2f918d181cDBd7a8E208f',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xfF20817765cB7f73d4bde2e66e067E58D11095C2',
      name: 'Amp',
      symbol: 'AMP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12409/thumb/amp-200x200.png?1599625397',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x0621d647cecbFb64b79E44302c1933cB4f27054d',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
      name: 'Ankr',
      symbol: 'ANKR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4324/thumb/U85xTl2.png?1608111978',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xf307910A4c7bbc79691fD374889b36d8531B08e3',
          },
          '137': {
            tokenAddress: '0x101A023270368c0D50BFfb62780F4aFd4ea79C35',
          },
          '42161': {
            tokenAddress: '0x1bfc5d35bf0f7B9e15dc24c78b8C02dbC1e95447',
          },
          '43114': {
            tokenAddress: '0x20CF1b6E9d856321ed4686877CF4538F2C84B4dE',
          },
        },
      },
    },
    {
      name: 'Aragon',
      address: '0xa117000000f279D81A1D3cc75430fAA017FA5A2e',
      symbol: 'ANT',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/681/thumb/JelZ58cv_400x400.png?1601449653',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x2b8504ab5eFc246d0eC5Ec7E74565683227497de',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg?1647476455',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xB7b31a6BC18e48888545CE79e83E06003bE70930',
          },
          '42161': {
            tokenAddress: '0x74885b4D524d497261259B38900f54e6dbAd2210',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
      name: 'API3',
      symbol: 'API3',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13256/thumb/api3.jpg?1606751424',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x45C27821E80F8789b60Fd8B600C73815d34DDa6C',
          },
          '42161': {
            tokenAddress: '0xF01dB12F50D0CDF5Fe360ae005b9c52F92CA7811',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Arbitrum',
      address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
      symbol: 'ARB',
      decimals: 18,
      logoURI: 'https://arbitrum.foundation/logo.png',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xBA50933C268F567BDC86E1aC131BE072C6B0b71a',
      name: 'ARPA Chain',
      symbol: 'ARPA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8506/thumb/9u0a23XY_400x400.jpg?1559027357',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x334cc734866E97D8452Ae6261d68Fd9bc9BFa31E',
          },
          '56': {
            tokenAddress: '0x6F769E65c14Ebd1f68817F5f1DcDb61Cfa2D6f7e',
          },
          '137': {
            tokenAddress: '0xEE800B277A96B0f490a1A732e1D6395FAD960A26',
          },
          '8453': {
            tokenAddress: '0x1C9Fa01e87487712706Fb469a13bEb234262C867',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x64D91f12Ece7362F91A6f8E7940Cd55F05060b92',
      name: 'ASH',
      symbol: 'ASH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15714/thumb/omnPqaTY.png?1622820503',
    },
    {
      chainId: 1,
      address: '0x2565ae0385659badCada1031DB704442E1b69982',
      name: 'Assemble Protocol',
      symbol: 'ASM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11605/thumb/gpvrlkSq_400x400_%281%29.jpg?1591775789',
    },
    {
      chainId: 1,
      address: '0x27054b13b1B798B345b591a4d22e6562d47eA75a',
      name: 'AirSwap',
      symbol: 'AST',
      decimals: 4,
      logoURI:
        'https://assets.coingecko.com/coins/images/1019/thumb/Airswap.png?1630903484',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x04bEa9FCE76943E90520489cCAb84E84C0198E29',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xA2120b9e674d3fC3875f415A7DF52e382F141225',
      name: 'Automata',
      symbol: 'ATA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15985/thumb/ATA.jpg?1622535745',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xA2120b9e674d3fC3875f415A7DF52e382F141225',
          },
          '137': {
            tokenAddress: '0x0df0f72EE0e5c9B7ca761ECec42754992B2Da5BF',
          },
          '42161': {
            tokenAddress: '0xAC9Ac2C17cdFED4AbC80A53c5553388575714d03',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xA9B1Eb5908CfC3cdf91F9B8B3a74108598009096',
      name: 'Bounce',
      symbol: 'AUCTION',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13860/thumb/1_KtgpRIJzuwfHe0Rl0avP_g.jpeg?1612412025',
    },
    {
      chainId: 1,
      address: '0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998',
      name: 'Audius',
      symbol: 'AUDIO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12913/thumb/AudiusCoinLogo_2x.png?1603425727',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x5eB8D998371971D01954205c7AFE90A7AF6a95AC',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x845576c64f9754CF09d87e45B720E82F3EeF522C',
      name: 'Artverse Token',
      symbol: 'AVT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19727/thumb/ewnektoB_400x400.png?1635767094',
    },
    {
      chainId: 1,
      address: '0x467719aD09025FcC6cF6F8311755809d45a5E5f3',
      name: 'Axelar',
      symbol: 'AXL',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/27277/large/V-65_xQ1_400x400.jpeg',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x8b1f4432F943c465A973FeDC6d7aa50Fc96f1f65',
          },
          '42161': {
            tokenAddress: '0x23ee2343B892b1BB63503a4FAbc840E0e2C6810f',
          },
          '43114': {
            tokenAddress: '0x44c784266cf024a60e8acF2427b9857Ace194C5d',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b',
      name: 'Axie Infinity',
      symbol: 'AXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13029/thumb/axie_infinity_logo.png?1604471082',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x715D400F88C167884bbCc41C5FeA407ed4D2f8A0',
          },
          '137': {
            tokenAddress: '0x61BDD9C7d4dF4Bf47A4508c0c8245505F2Af5b7b',
          },
          '42161': {
            tokenAddress: '0xe88998Fb579266628aF6a03e3821d5983e5D0089',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3472A5A71965499acd81997a54BBA8D852C6E53d',
      name: 'Badger DAO',
      symbol: 'BADGER',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13287/thumb/badger_dao_logo.jpg?1607054976',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x1FcbE5937B0cc2adf69772D228fA4205aCF4D9b2',
          },
          '42161': {
            tokenAddress: '0xBfa641051Ba0a0Ad1b0AcF549a89536A0D76472E',
          },
        },
      },
    },
    {
      name: 'Balancer',
      address: '0xba100000625a3754423978a60c9317c58a424e3D',
      symbol: 'BAL',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xba100000625a3754423978a60c9317c58a424e3D/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xFE8B128bA8C78aabC59d4c64cEE7fF28e9379921',
          },
          '137': {
            tokenAddress: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3',
          },
          '8453': {
            tokenAddress: '0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1',
          },
          '42161': {
            tokenAddress: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xBA11D00c5f74255f56a5E366F4F77f5A186d7f55',
      name: 'Band Protocol',
      symbol: 'BAND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9545/thumb/band-protocol.png?1568730326',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xA8b1E0764f85f53dfe21760e8AfE5446D82606ac',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
      name: 'Basic Attention Token',
      symbol: 'BAT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x3Cef98bb43d732E2F285eE605a8158cDE967D219',
          },
          '42161': {
            tokenAddress: '0x3450687EF141dCd6110b77c2DC44B008616AeE75',
          },
          '43114': {
            tokenAddress: '0x98443B96EA4b0858FDF3219Cd13e98C7A4690588',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xF17e65822b568B3903685a7c9F496CF7656Cc6C2',
      name: 'Biconomy',
      symbol: 'BICO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/21061/thumb/biconomy_logo.jpg?1638269749',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x91c89A94567980f0e9723b487b0beD586eE96aa7',
          },
          '42161': {
            tokenAddress: '0xa68Ec98D7ca870cF1Dd0b00EBbb7c4bF60A8e74d',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x64Bc2cA1Be492bE7185FAA2c8835d9b824c8a194',
      name: 'Big Time',
      symbol: 'BIGTIME',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/32251/standard/-6136155493475923781_121.jpg?1696998691',
    },
    {
      chainId: 1,
      address: '0x1A4b46696b2bB4794Eb3D4c26f1c55F9170fa4C5',
      name: 'BitDAO',
      symbol: 'BIT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17627/thumb/rI_YptK8.png?1653983088',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0x406C8dB506653D882295875F633bEC0bEb921C2A',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x5283D291DBCF85356A21bA090E6db59121208b44',
      name: 'Blur',
      symbol: 'BLUR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/28453/large/blur.png?1670745921',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0xEf171a5BA71348eff16616fd692855c2Fe606EB2',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x5732046A883704404F284Ce41FfADd5b007FD668',
      name: 'Bluzelle',
      symbol: 'BLZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2848/thumb/ColorIcon_3x.png?1622516510',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x935a544Bf5816E3A7C13DB2EFe3009Ffda0aCdA2',
          },
          '137': {
            tokenAddress: '0x438B28C5AA5F00a817b7Def7cE2Fb3d5d1970974',
          },
        },
      },
    },
    {
      name: 'Bancor Network Token',
      address: '0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C',
      symbol: 'BNT',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xc26D47d5c33aC71AC5CF9F776D63Ba292a4F7842',
          },
          '42161': {
            tokenAddress: '0x7A24159672b83ED1b89467c9d6A99556bA06D073',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x42bBFa2e77757C645eeaAd1655E0911a7553Efbc',
      name: 'Boba Network',
      symbol: 'BOBA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/20285/thumb/BOBA.png?1636811576',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xa4B2B20b2C73c7046ED19AC6bfF5E5285c58F20a',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x0391D2021f89DC339F60Fff84546EA23E337750f',
      name: 'BarnBridge',
      symbol: 'BOND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12811/thumb/barnbridge.jpg?1602728853',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x3e7eF8f50246f725885102E8238CBba33F276747',
          },
          '137': {
            tokenAddress: '0xA041544fe2BE56CCe31Ebb69102B965E06aacE80',
          },
          '42161': {
            tokenAddress: '0x0D81E50bC677fa67341c44D7eaA9228DEE64A4e1',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x799ebfABE77a6E34311eeEe9825190B9ECe32824',
      name: 'Braintrust',
      symbol: 'BTRST',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18100/thumb/braintrust.PNG?1630475394',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xEd50aCE88bd42B45cB0F49be15395021E141254e',
          },
          '8453': {
            tokenAddress: '0xA7d68d155d17cB30e311367c2Ef1E82aB6022b67',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
      name: 'Binance USD',
      symbol: 'BUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9576/thumb/BUSD.png?1568947766',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39',
          },
          '56': {
            tokenAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
          },
          '137': {
            tokenAddress: '0xdAb529f40E671A1D4bF91361c21bf9f0C9712ab7',
          },
          '42161': {
            tokenAddress: '0x31190254504622cEFdFA55a7d3d272e6462629a2',
          },
          '43114': {
            tokenAddress: '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xAE12C5930881c53715B369ceC7606B70d8EB229f',
      name: 'Coin98',
      symbol: 'C98',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17117/thumb/logo.png?1626412904',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xaEC945e04baF28b135Fa7c640f624f8D90F1C3a6',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
      name: 'Coinbase Wrapped Staked ETH',
      symbol: 'cbETH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/27008/large/cbeth.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xadDb6A0412DE1BA0F936DCaeb8Aaa24578dcF3B2',
          },
          '8453': {
            tokenAddress: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
          },
          '42161': {
            tokenAddress: '0x1DEBd73E752bEaF79865Fd6446b0c970EaE7732f',
          },
          '84531': {
            tokenAddress: '0x4fC531f8Ae7A7808E0dccCA08F1e3c7694582950',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3294395e62F4eB6aF3f1Fcf89f5602D90Fb3Ef69',
      name: 'Celo native asset (Wormhole)',
      symbol: 'CELO',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/wormhole-foundation/wormhole-token-list/main/assets/celo_wh.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x9b88D293b7a791E40d36A39765FFd5A1B9b5c349',
          },
          '42161': {
            tokenAddress: '0x4E51aC49bC5e2d87e0EF713E9e5AB2D71EF4F336',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x4F9254C83EB525f9FCf346490bbb3ed28a81C667',
      name: 'Celer Network',
      symbol: 'CELR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4379/thumb/Celr.png?1554705437',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x91a4635F620766145C099E15889Bd2766906A559',
          },
          '42161': {
            tokenAddress: '0x3a8B787f78D775AECFEEa15706D4221B40F345AB',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x8A2279d4A90B6fe1C4B30fa660cC9f926797bAA2',
      name: 'Chromia',
      symbol: 'CHR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/5000/thumb/Chromia.png?1559038018',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xf9CeC8d50f6c8ad3Fb6dcCEC577e05aA32B224FE',
          },
          '137': {
            tokenAddress: '0x594C984E3318e91313f881B021A0C4203fF5E59F',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF',
      name: 'Chiliz',
      symbol: 'CHZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8834/thumb/Chiliz.png?1561970540',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xf1938Ce12400f9a761084E7A80d37e732a4dA056',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x80C62FE4487E1351b47Ba49809EBD60ED085bf52',
      name: 'Clover Finance',
      symbol: 'CLV',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15278/thumb/clover.png?1645084454',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x09E889BB4D5b474f561db0491C38702F367A4e4d',
          },
        },
      },
    },
    {
      name: 'Compound',
      address: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
      symbol: 'COMP',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x52CE071Bd9b1C4B00A0b92D298c512478CaD67e8',
          },
          '137': {
            tokenAddress: '0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c',
          },
          '8453': {
            tokenAddress: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
          },
          '42161': {
            tokenAddress: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
          },
          '43114': {
            tokenAddress: '0xc3048E19E76CB9a3Aa9d77D8C03c29Fc906e2437',
          },
          '84531': {
            tokenAddress: '0xA29b548056c3fD0f68BAd9d4829EC4E66f22f796',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xDDB3422497E61e13543BeA06989C0789117555c5',
      name: 'COTI',
      symbol: 'COTI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2962/thumb/Coti.png?1559653863',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0x6FE14d3CC2f7bDdffBa5CdB3BBE7467dd81ea101',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3D658390460295FB963f54dC0899cfb1c30776Df',
      name: 'Circuits of Value',
      symbol: 'COVAL',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/588/thumb/coval-logo.png?1599493950',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xd15CeE1DEaFBad6C0B3Fd7489677Cc102B141464',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xD417144312DbF50465b1C641d016962017Ef6240',
      name: 'Covalent',
      symbol: 'CQT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14168/thumb/covalent-cqt.png?1624545218',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x93B0fF1C8828F6eB039D345Ff681eD735086d925',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b',
      name: 'Cronos',
      symbol: 'CRO',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/7310/thumb/oCw2s3GI_400x400.jpeg?1645172042',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xAdA58DF0F643D959C2A47c9D4d4c1a4deFe3F11C',
          },
          '42161': {
            tokenAddress: '0x8ea3156f834A0dfC78F1A5304fAC2CdA676F354C',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x08389495D7456E1951ddF7c3a1314A4bfb646d8B',
      name: 'Crypterium',
      symbol: 'CRPT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1901/thumb/crypt.png?1547036205',
    },
    {
      name: 'Curve DAO Token',
      address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
      symbol: 'CRV',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD533a949740bb3306d119CC777fa900bA034cd52/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53',
          },
          '137': {
            tokenAddress: '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
          },
          '8453': {
            tokenAddress: '0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415',
          },
          '42161': {
            tokenAddress: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D',
      name: 'Cartesi',
      symbol: 'CTSI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11038/thumb/cartesi.png?1592288021',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xEc6adef5E1006bb305bB1975333e8fc4071295bf',
          },
          '56': {
            tokenAddress: '0x8dA443F84fEA710266C8eB6bC34B71702d033EF2',
          },
          '137': {
            tokenAddress: '0x2727Ab1c2D22170ABc9b595177B2D5C6E1Ab7B7B',
          },
          '42161': {
            tokenAddress: '0x319f865b287fCC10b30d8cE6144e8b6D1b476999',
          },
          '43114': {
            tokenAddress: '0x6b289CCeAA8639e3831095D75A3e43520faBf552',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x321C2fE4446C7c963dc41Dd58879AF648838f98D',
      name: 'Cryptex Finance',
      symbol: 'CTX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14932/thumb/glossy_icon_-_C200px.png?1619073171',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x8c208BC2A808a088a78398fed8f2640cab0b6EDb',
          },
          '42161': {
            tokenAddress: '0x84F5c2cFba754E76DD5aE4fB369CfC920425E12b',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xDf801468a808a32656D2eD2D2d80B72A129739f4',
      name: 'Somnium Space CUBEs',
      symbol: 'CUBE',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/10687/thumb/CUBE_icon.png?1617026861',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x276C9cbaa4BDf57d7109a41e67BD09699536FA3d',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x41e5560054824eA6B0732E656E3Ad64E20e94E45',
      name: 'Civic',
      symbol: 'CVC',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/788/thumb/civic.png?1547034556',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x66Dc5A08091d1968e08C16aA5b27BAC8398b02Be',
          },
          '42161': {
            tokenAddress: '0x9DfFB23CAd3322440bCcFF7aB1C58E781dDBF144',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
      name: 'Convex Finance',
      symbol: 'CVX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15585/thumb/convex.png?1621256328',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x4257EA7637c355F81616050CbB6a9b709fd72683',
          },
          '42161': {
            tokenAddress: '0xaAFcFD42c9954C6689ef1901e03db742520829c5',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbol: 'DAI',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
          },
          '56': {
            tokenAddress: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
          },
          '137': {
            tokenAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
          },
          '8453': {
            tokenAddress: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
          },
          '42161': {
            tokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
          },
          '43114': {
            tokenAddress: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
          },
          '84531': {
            tokenAddress: '0x174956bDfbCEb6e53089297cce4fE2825E58d92C',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x081131434f93063751813C619Ecca9C4dC7862a3',
      name: 'Mines of Dalarnia',
      symbol: 'DAR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/19837/thumb/dar.png?1636014223',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x23CE9e926048273eF83be0A3A8Ba9Cb6D45cd978',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3A880652F47bFaa771908C07Dd8673A787dAEd3A',
      name: 'DerivaDAO',
      symbol: 'DDX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13453/thumb/ddx_logo.png?1608741641',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x26f5FB1e6C8a65b3A873fF0a213FA16EFF5a7828',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3597bfD533a99c9aa083587B074434E61Eb0A258',
      name: 'Dent',
      symbol: 'DENT',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/1152/thumb/gLCEA2G.png?1604543239',
    },
    {
      chainId: 1,
      address: '0xfB7B4564402E5500dB5bB6d63Ae671302777C75a',
      name: 'DexTools',
      symbol: 'DEXT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11603/thumb/dext.png?1605790188',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xe91a8D2c584Ca93C7405F15c22CdFE53C29896E3',
          },
          '137': {
            tokenAddress: '0xff835562C761205659939B64583dd381a6AA4D92',
          },
          '42161': {
            tokenAddress: '0x3Be7cB2e9413Ef8F42b4A202a0114EB59b64e227',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
      name: 'DIA',
      symbol: 'DIA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11955/thumb/image.png?1646041751',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x99956D38059cf7bEDA96Ec91Aa7BB2477E0901DD',
          },
          '137': {
            tokenAddress: '0x993f2CafE9dbE525243f4A78BeBC69DAc8D36000',
          },
          '42161': {
            tokenAddress: '0xca642467C6Ebe58c13cB4A7091317f34E17ac05e',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x0AbdAce70D3790235af448C88547603b945604ea',
      name: 'district0x',
      symbol: 'DNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/849/thumb/district0x.png?1547223762',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0xE3696a02b2C9557639E29d829E9C45EFa49aD47A',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b',
      name: 'DeFi Pulse Index',
      symbol: 'DPI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12465/thumb/defi_pulse_index_set.png?1600051053',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369',
          },
          '42161': {
            tokenAddress: '0x4667cf53C4eDF659E402B733BEA42B18B68dd74c',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3Ab6Ed69Ef663bd986Ee59205CCaD8A20F98b4c2',
      name: 'Drep',
      symbol: 'DREP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14578/thumb/KotgsCgS_400x400.jpg?1617094445',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xEC583f25A049CC145dA9A256CDbE9B6201a705Ff',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x92D6C1e31e14520e676a687F0a93788B716BEff5',
      name: 'dYdX',
      symbol: 'DYDX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17500/thumb/hjnIm9bV.jpg?1628009360',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x4C3bF0a3DE9524aF68327d1D2558a3B70d17D42a',
          },
          '42161': {
            tokenAddress: '0x51863cB90Ce5d6dA9663106F292fA27c8CC90c5a',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17',
      name: 'DeFi Yield Protocol',
      symbol: 'DYP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13480/thumb/DYP_Logo_Symbol-8.png?1655809066',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17',
          },
          '43114': {
            tokenAddress: '0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xe6fd75ff38Adca4B97FBCD938c86b98772431867',
      name: 'Elastos',
      symbol: 'ELA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2780/thumb/Elastos.png?1597048112',
    },
    {
      chainId: 1,
      address: '0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3',
      name: 'Dogelon Mars',
      symbol: 'ELON',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14962/thumb/6GxcPRo3_400x400.jpg?1619157413',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x7bd6FaBD64813c48545C9c0e312A0099d9be2540',
          },
          '137': {
            tokenAddress: '0xE0339c80fFDE91F3e20494Df88d4206D86024cdF',
          },
          '42161': {
            tokenAddress: '0x3e4Cff6E50F37F731284A92d44AE943e17077fD4',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c',
      name: 'Enjin Coin',
      symbol: 'ENJ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1102/thumb/enjin-coin-logo.png?1547035078',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x7eC26842F195c852Fa843bB9f6D8B583a274a157',
          },
          '42161': {
            tokenAddress: '0x7fa9549791EFc9030e1Ed3F25D18014163806758',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
      name: 'Ethereum Name Service',
      symbol: 'ENS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19785/thumb/acatxTm8_400x400.jpg?1635850140',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x65559aA14915a70190438eF90104769e5E890A00',
          },
          '137': {
            tokenAddress: '0xbD7A5Cf51d22930B8B3Df6d834F9BCEf90EE7c4f',
          },
          '42161': {
            tokenAddress: '0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xBBc2AE13b23d715c30720F079fcd9B4a74093505',
      name: 'Ethernity Chain',
      symbol: 'ERN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14238/thumb/LOGO_HIGH_QUALITY.png?1647831402',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x0E50BEA95Fe001A370A4F1C220C49AEdCB982DeC',
          },
          '42161': {
            tokenAddress: '0x2354c8e9Ea898c751F1A15Addeb048714D667f96',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xd9Fcd98c322942075A5C3860693e9f4f03AAE07b',
      name: 'Euler',
      symbol: 'EUL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/26149/thumb/YCvKDfl8_400x400.jpeg?1656041509',
    },
    {
      chainId: 1,
      address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
      name: 'Euro Coin',
      symbol: 'EURC',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/26045/standard/euro.png?1696525125',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x8a037dbcA8134FFc72C362e394e35E0Cad618F85',
          },
          '42161': {
            tokenAddress: '0x863708032B5c328e11aBcbC0DF9D79C71Fc52a48',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xa0246c9032bC3A600820415aE600c6388619A14D',
      name: 'Harvest Finance',
      symbol: 'FARM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12304/thumb/Harvest.png?1613016180',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x4B5C23cac08a567ecf0c1fFcA8372A45a5D33743',
          },
          '137': {
            tokenAddress: '0x176f5AB638cf4Ff3B6239Ba609C3fadAA46ef5B0',
          },
          '8453': {
            tokenAddress: '0xD08a2917653d4E460893203471f0000826fb4034',
          },
          '42161': {
            tokenAddress: '0x8553d254Cb6934b16F87D2e486b64BbD24C83C70',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
      name: 'Fetch ai',
      symbol: 'FET',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/5681/thumb/Fetch.jpg?1572098136',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x031b41e504677879370e9DBcF937283A8691Fa7f',
          },
          '137': {
            tokenAddress: '0x7583FEDDbceFA813dc18259940F76a02710A8905',
          },
          '42161': {
            tokenAddress: '0x4BE87C766A7CE11D5Cc864b6C3Abb7457dCC4cC9',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xef3A930e1FfFFAcd2fc13434aC81bD278B0ecC8d',
      name: 'Stafi',
      symbol: 'FIS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12423/thumb/stafi_logo.jpg?1599730991',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xD8737CA46aa6285dE7B8777a8e3db232911baD41',
          },
          '137': {
            tokenAddress: '0x7A7B94F18EF6AD056CDa648588181CDA84800f94',
          },
          '42161': {
            tokenAddress: '0x849B40AB2469309117Ed1038c5A99894767C7282',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x41545f8b9472D758bB669ed8EaEEEcD7a9C4Ec29',
      name: 'Forta',
      symbol: 'FORT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/25060/thumb/Forta_lgo_%281%29.png?1655353696',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x9ff62d1FC52A907B6DCbA8077c2DDCA6E6a9d3e1',
          },
          '42161': {
            tokenAddress: '0x3A1429d50E0cBBc45c997aF600541Fe1cc3D2923',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x77FbA179C79De5B7653F68b5039Af940AdA60ce0',
      name: 'Ampleforth Governance Token',
      symbol: 'FORTH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14917/thumb/photo_2021-04-22_00.00.03.jpeg?1619020835',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x5eCbA59DAcc1ADc5bDEA35f38A732823fc3dE977',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      name: 'ShapeShift FOX Token',
      symbol: 'FOX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9988/thumb/FOX.png?1574330622',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xF1a0DA3367BC7aa04F8D94BA57B862ff37CeD174',
          },
          '137': {
            tokenAddress: '0x65A05DB8322701724c197AF82C9CaE41195B0aA8',
          },
          '42161': {
            tokenAddress: '0xf929de51D91C77E42f5090069E0AD7A09e513c73',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
      name: 'Frax',
      symbol: 'FRAX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13422/thumb/frax_logo.png?1608476506',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475',
          },
          '56': {
            tokenAddress: '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40',
          },
          '137': {
            tokenAddress: '0x104592a158490a9228070E0A8e5343B499e125D0',
          },
          '42161': {
            tokenAddress: '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305',
          },
          '43114': {
            tokenAddress: '0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x4E15361FD6b4BB609Fa63C81A2be19d873717870',
      name: 'Fantom',
      symbol: 'FTM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4001/thumb/Fantom.png?1558015016',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xAD29AbB318791D579433D831ed122aFeAf29dcfe',
          },
          '137': {
            tokenAddress: '0xC9c1c1c20B3658F8787CC2FD702267791f224Ce1',
          },
          '42161': {
            tokenAddress: '0xd42785D323e608B9E99fa542bd8b1000D4c2Df37',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x8c15Ef5b4B21951d50E53E4fbdA8298FFAD25057',
      name: 'Function X',
      symbol: 'FX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8186/thumb/47271330_590071468072434_707260356350705664_n.jpg?1556096683',
    },
    {
      chainId: 1,
      address: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
      name: 'Frax Share',
      symbol: 'FXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13423/thumb/frax_share.png?1608478989',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x67CCEA5bb16181E7b4109c9c2143c24a1c2205Be',
          },
          '56': {
            tokenAddress: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE',
          },
          '137': {
            tokenAddress: '0x3e121107F6F22DA4911079845a470757aF4e1A1b',
          },
          '42161': {
            tokenAddress: '0xd9f9d2Ee2d3EFE420699079f16D9e924affFdEA4',
          },
          '43114': {
            tokenAddress: '0x214DB107654fF987AD859F34125307783fC8e387',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x5fAa989Af96Af85384b8a938c2EdE4A7378D9875',
      name: 'Project Galaxy',
      symbol: 'GAL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24530/thumb/GAL-Token-Icon.png?1651483533',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xe4Cc45Bb5DBDA06dB6183E8bf016569f40497Aa5',
          },
          '42161': {
            tokenAddress: '0xc27E7325a6BEA1FcC06de7941473f5279bfd1182',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xd1d2Eb1B1e90B638588728b4130137D262C87cae',
      name: 'GALA',
      symbol: 'GALA',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/12493/standard/GALA-COINGECKO.png?1696512310',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0x2A676eeAd159c4C8e8593471c6d666F02827FF8C',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xdab396cCF3d84Cf2D07C4454e10C8A6F5b008D2b',
      name: 'Goldfinch',
      symbol: 'GFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19081/thumb/GOLDFINCH.png?1634369662',
    },
    {
      chainId: 1,
      address: '0x3F382DbD960E3a9bbCeaE22651E88158d2791550',
      name: 'Aavegotchi',
      symbol: 'GHST',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12467/thumb/ghst_200.png?1600750321',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x7DD9c5Cba05E151C895FDe1CF355C9A1D5DA6429',
      name: 'Golem',
      symbol: 'GLM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/542/thumb/Golem_Submark_Positive_RGB.png?1606392013',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x0B220b82F3eA3B7F6d9A1D8ab58930C064A2b5Bf',
          },
        },
      },
    },
    {
      name: 'Gnosis Token',
      address: '0x6810e776880C02933D47DB1b9fc05908e5386b96',
      symbol: 'GNO',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6810e776880C02933D47DB1b9fc05908e5386b96/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x5FFD62D3C3eE2E81C00A7b9079FB248e7dF024A8',
          },
          '42161': {
            tokenAddress: '0xa0b862F60edEf4452F25B4160F177db44DeB6Cf1',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xccC8cb5229B0ac8069C51fd58367Fd1e622aFD97',
      name: 'Gods Unchained',
      symbol: 'GODS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17139/thumb/10631.png?1635718182',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xF88fc6b493eda7650E4bcf7A290E8d108F677CfE',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
      name: 'The Graph',
      symbol: 'GRT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13397/thumb/Graph_Token.png?1608145566',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x5fe2B58c013d7601147DcdD68C143A77499f5531',
          },
          '42161': {
            tokenAddress: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7',
          },
          '43114': {
            tokenAddress: '0x8a0cAc13c7da965a312f08ea4229c37869e85cB9',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F',
      name: 'Gitcoin',
      symbol: 'GTC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15810/thumb/gitcoin.png?1621992929',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x1EBA7a6a72c894026Cd654AC5CDCF83A46445B08',
          },
          '137': {
            tokenAddress: '0xdb95f9188479575F3F718a245EcA1B3BF74567EC',
          },
          '42161': {
            tokenAddress: '0x7f9a7DB853Ca816B9A138AEe3380Ef34c437dEe0',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd',
      name: 'Gemini Dollar',
      symbol: 'GUSD',
      decimals: 2,
      logoURI:
        'https://assets.coingecko.com/coins/images/5992/thumb/gemini-dollar-gusd.png?1536745278',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xC8A94a3d3D2dabC3C1CaffFFDcA6A7543c3e3e65',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xC08512927D12348F6620a698105e1BAac6EcD911',
      name: 'GYEN',
      symbol: 'GYEN',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/14191/thumb/icon_gyen_200_200.png?1614843343',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x589d35656641d6aB57A545F08cf473eCD9B6D5F7',
          },
          '137': {
            tokenAddress: '0x482bc619eE7662759CDc0685B4E78f464Da39C73',
          },
          '42161': {
            tokenAddress: '0x589d35656641d6aB57A545F08cf473eCD9B6D5F7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xb3999F658C0391d94A37f7FF328F3feC942BcADC',
      name: 'Hashflow',
      symbol: 'HFT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/26136/large/hashflow-icon-cmc.png',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x44Ec807ce2F4a6F2737A92e985f318d035883e47',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x71Ab77b7dbB4fa7e017BC15090b2163221420282',
      name: 'Highstreet',
      symbol: 'HIGH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18973/thumb/logosq200200Coingecko.png?1634090470',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x5f4Bde007Dc06b867f86EBFE4802e34A1fFEEd63',
          },
          '42161': {
            tokenAddress: '0xd12Eeb0142D4Efe7Af82e4f29E5Af382615bcEeA',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'HOPR',
      symbol: 'HOPR',
      logoURI:
        'https://assets.coingecko.com/coins/images/14061/thumb/Shared_HOPR_logo_512px.png?1614073468',
      address: '0xF5581dFeFD8Fb0e4aeC526bE659CFaB1f8c781dA',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x6cCBF3627b2C83AFEF05bf2F035E7f7B210Fe30D',
          },
          '42161': {
            tokenAddress: '0x177F394A3eD18FAa85c1462Ae626438a70294EF7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xB705268213D593B8FD88d3FDEFF93AFF5CbDcfAE',
      name: 'IDEX',
      symbol: 'IDEX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2565/thumb/logomark-purple-286x286.png?1638362736',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x9Cb74C8032b007466865f060ad2c46145d45553D',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
      name: 'Illuvium',
      symbol: 'ILV',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/14468/large/ILV.JPG',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xFA46dAf9909e116DBc40Fe1cC95fC0Bb1f452aBE',
          },
          '42161': {
            tokenAddress: '0x61cA9D186f6b9a793BC08F6C79fd35f205488673',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF',
      name: 'Immutable X',
      symbol: 'IMX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17233/thumb/imx.png?1636691817',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x183070C90B34A63292cC908Ce1b263Cb56D49A7F',
          },
          '42161': {
            tokenAddress: '0x3cFD99593a7F035F717142095a3898e3Fca7783e',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Index Cooperative',
      symbol: 'INDEX',
      logoURI:
        'https://assets.coingecko.com/coins/images/12729/thumb/index.png?1634894321',
      address: '0x0954906da0Bf32d5479e25f46056d22f08464cab',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xfBd8A3b908e764dBcD51e27992464B4432A1132b',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30',
      name: 'Injective',
      symbol: 'INJ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12882/thumb/Secondary_Symbol.png?1628233237',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xa2B726B1145A4773F68593CF171187d8EBe4d495',
          },
          '137': {
            tokenAddress: '0x4E8dc2149EaC3f3dEf36b1c281EA466338249371',
          },
          '42161': {
            tokenAddress: '0x2A2053cb633CAD465B4A8975eD3d7f09DF608F80',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x41D5D79431A913C4aE7d69a668ecdfE5fF9DFB68',
      name: 'Inverse Finance',
      symbol: 'INV',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14205/thumb/inverse_finance.jpg?1614921871',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xF18Ac368001b0DdC80aA6a8374deb49e868EFDb8',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6fB3e0A217407EFFf7Ca062D46c26E5d60a14d69',
      name: 'IoTeX',
      symbol: 'IOTX',
      decimals: 18,
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2777.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xf6372cDb9c1d3674E83842e3800F2A62aC9F3C66',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Geojam',
      symbol: 'JAM',
      logoURI:
        'https://assets.coingecko.com/coins/images/24648/thumb/ey40AzBN_400x400.jpg?1648507272',
      address: '0x23894DC9da6c94ECb439911cAF7d337746575A72',
      decimals: 18,
    },
    {
      chainId: 1,
      address: '0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC',
      name: 'JasmyCoin',
      symbol: 'JASMY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13876/thumb/JASMY200x200.jpg?1612473259',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xb87f5c1E81077FfcfE821dA240fd20C99c533aF1',
          },
          '42161': {
            tokenAddress: '0x25f05699548D3A0820b99f93c10c8BB573E27083',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Jupiter',
      symbol: 'JUP',
      logoURI:
        'https://assets.coingecko.com/coins/images/10351/thumb/logo512.png?1632480932',
      address: '0x4B1E80cAC91e2216EEb63e29B957eB91Ae9C2Be8',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x0231f91e02DebD20345Ae8AB7D71A41f8E140cE7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC',
      name: 'Keep Network',
      symbol: 'KEEP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3373/thumb/IuNzUb5b_400x400.jpg?1589526336',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x42f37A1296b2981F7C3cAcEd84c5096b2Eb0C72C',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'SelfKey',
      symbol: 'KEY',
      logoURI:
        'https://assets.coingecko.com/coins/images/2034/thumb/selfkey.png?1548608934',
      address: '0x4CC19356f2D37338b9802aa8E8fc58B0373296E7',
      decimals: 18,
    },
    {
      name: 'Kyber Network Crystal',
      address: '0xdd974D5C2e2928deA5F71b9825b8b646686BD200',
      symbol: 'KNC',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdd974D5C2e2928deA5F71b9825b8b646686BD200/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x324b28d6565f784d596422B0F2E5aB6e9CFA1Dc7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
      name: 'Keep3rV1',
      symbol: 'KP3R',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12966/thumb/kp3r_logo.jpg?1607057458',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x53AEc293212E3B792563Bc16f1be26956adb12e9',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x464eBE77c293E473B48cFe96dDCf88fcF7bFDAC0',
      name: 'KRYLL',
      symbol: 'KRL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2807/thumb/krl.png?1547036979',
    },
    {
      chainId: 1,
      address: '0x037A54AaB062628C9Bbae1FDB1583c195585fe41',
      name: 'LCX',
      symbol: 'LCX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9985/thumb/zRPSu_0o_400x400.jpg?1574327008',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xE8A51D0dD1b4525189ddA2187F90ddF0932b5482',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
      name: 'Lido DAO',
      symbol: 'LDO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13573/thumb/Lido_DAO.png?1609873644',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xFdb794692724153d1488CcdBE0C56c252596735F',
          },
          '137': {
            tokenAddress: '0xC3C7d422809852031b44ab29EEC9F1EfF2A58756',
          },
          '42161': {
            tokenAddress: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60',
          },
        },
      },
    },
    {
      name: 'ChainLink Token',
      address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      symbol: 'LINK',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
          },
          '56': {
            tokenAddress: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
          },
          '137': {
            tokenAddress: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
          },
          '42161': {
            tokenAddress: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
          },
          '43114': {
            tokenAddress: '0x5947BB275c521040051D82396192181b413227A3',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'League of Kingdoms',
      symbol: 'LOKA',
      logoURI:
        'https://assets.coingecko.com/coins/images/22572/thumb/loka_64pix.png?1642643271',
      address: '0x61E90A50137E1F645c9eF4a0d3A4f01477738406',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x465b67CB20A7E8bC4c51b4C7DA591C1945b41427',
          },
        },
      },
    },
    {
      name: 'Loom Network',
      address: '0xA4e8C3Ec456107eA67d3075bF9e3DF3A75823DB0',
      symbol: 'LOOM',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA4e8C3Ec456107eA67d3075bF9e3DF3A75823DB0/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x66EfB7cC647e0efab02eBA4316a2d2941193F6b3',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
      name: 'Livepeer',
      symbol: 'LPT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/7137/thumb/logo-circle-green.png?1619593365',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x3962F4A0A0051DccE0be73A7e09cEf5756736712',
          },
          '42161': {
            tokenAddress: '0x289ba1701C2F088cf0faf8B3705246331cB8A839',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D',
      name: 'Liquity',
      symbol: 'LQTY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14665/thumb/200-lqty-icon.png?1617631180',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x8Ab2Fec94d17ae69FB90E7c773f2C85Ed1802c01',
          },
          '42161': {
            tokenAddress: '0xfb9E5D956D889D91a82737B9bFCDaC1DCE3e1449',
          },
        },
      },
    },
    {
      name: 'LoopringCoin V2',
      address: '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD',
      symbol: 'LRC',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xFEaA9194F9F8c1B65429E31341a103071464907E',
          },
          '137': {
            tokenAddress: '0x84e1670F61347CDaeD56dcc736FB990fBB47ddC1',
          },
          '42161': {
            tokenAddress: '0x46d0cE7de6247b0A95f67b43B589b4041BaE7fbE',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Liquity USD',
      symbol: 'LUSD',
      logoURI:
        'https://assets.coingecko.com/coins/images/14666/thumb/Group_3.png?1617631327',
      address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xc40F949F8a4e094D1b49a23ea9241D289B7b2819',
          },
          '137': {
            tokenAddress: '0x23001f892c0C82b79303EDC9B9033cD190BB21c7',
          },
          '8453': {
            tokenAddress: '0x368181499736d0c0CC614DBB145E2EC1AC86b8c6',
          },
          '42161': {
            tokenAddress: '0x93b346b6BC2548dA6A1E7d98E9a421B42541425b',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
      name: 'Decentraland',
      symbol: 'MANA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/878/thumb/decentraland-mana.png?1550108745',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4',
          },
          '42161': {
            tokenAddress: '0x442d24578A564EF628A65e6a7E3e7be2a165E231',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x69af81e73A73B40adF4f3d4223Cd9b1ECE623074',
      name: 'Mask Network',
      symbol: 'MASK',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14051/thumb/Mask_Network.jpg?1614050316',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x3390108E913824B8eaD638444cc52B9aBdF63798',
          },
          '56': {
            tokenAddress: '0x2eD9a5C8C13b93955103B9a7C167B67Ef4d568a3',
          },
          '137': {
            tokenAddress: '0x2B9E7ccDF0F4e5B24757c1E1a80e311E34Cb10c7',
          },
          '42161': {
            tokenAddress: '0x533A7B414CD1236815a5e09F1E97FC7d5c313739',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'MATH',
      symbol: 'MATH',
      logoURI:
        'https://assets.coingecko.com/coins/images/11335/thumb/2020-05-19-token-200.png?1589940590',
      address: '0x08d967bb0134F2d07f7cfb6E246680c53927DD30',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xF218184Af829Cf2b0019F8E6F0b2423498a36983',
          },
          '137': {
            tokenAddress: '0x347ACCAFdA7F8c5BdeC57fa34a5b663CBd1aeca7',
          },
          '42161': {
            tokenAddress: '0x99F40b01BA9C469193B360f72740E416B17Ac332',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?1624446912',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD',
          },
          '137': {
            tokenAddress: '0x0000000000000000000000000000000000001010',
          },
          '42161': {
            tokenAddress: '0x561877b6b3DD7651313794e5F2894B2F18bE0766',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x949D48EcA67b17269629c7194F4b727d4Ef9E5d6',
      name: 'Merit Circle',
      symbol: 'MC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19304/thumb/Db4XqML.png?1634972154',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x949D48EcA67b17269629c7194F4b727d4Ef9E5d6',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xfC98e825A2264D890F9a1e68ed50E1526abCcacD',
      name: 'Moss Carbon Credit',
      symbol: 'MCO2',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14414/thumb/ENtxnThA_400x400.jpg?1615948522',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xAa7DbD1598251f856C12f63557A4C4397c253Cea',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x814e0908b12A99FeCf5BC101bB5d0b8B5cDf7d26',
      name: 'Measurable Data Token',
      symbol: 'MDT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2441/thumb/mdt_logo.png?1569813574',
    },
    {
      chainId: 1,
      name: 'Metis',
      symbol: 'METIS',
      logoURI:
        'https://assets.coingecko.com/coins/images/15595/thumb/metis.jpeg?1660285312',
      address: '0x9E32b13ce7f2E80A01932B42553652E053D6ed8e',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xe552Fb52a4F19e44ef5A967632DBc320B0820639',
          },
          '137': {
            tokenAddress: '0x1B9D40715E757Bdb9bdEC3215B898E46d8a3b71a',
          },
          '42161': {
            tokenAddress: '0x7F728F3595db17B0B359f4FC47aE80FAd2e33769',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
      name: 'Magic Internet Money',
      symbol: 'MIM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/16786/thumb/mimlogopng.png?1624979612',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba',
          },
          '137': {
            tokenAddress: '0x01288e04435bFcd4718FF203D6eD18146C17Cd4b',
          },
          '42161': {
            tokenAddress: '0xB20A02dfFb172C474BC4bDa3fD6f4eE70C04daf2',
          },
          '43114': {
            tokenAddress: '0x130966628846BFd36ff31a822705796e8cb8C18D',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x09a3EcAFa817268f77BE1283176B946C4ff2E608',
      name: 'Mirror Protocol',
      symbol: 'MIR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13295/thumb/mirror_logo_transparent.png?1611554658',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x5B6DcF557E2aBE2323c48445E8CC948910d8c2c9',
          },
          '137': {
            tokenAddress: '0x1C5cccA2CB59145A4B25F452660cbA6436DDce9b',
          },
        },
      },
    },
    {
      name: 'Maker',
      address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
      symbol: 'MKR',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xab7bAdEF82E9Fe11f6f33f87BC9bC2AA27F2fCB5',
          },
          '137': {
            tokenAddress: '0x6f7C932e7684666C9fd1d44527765433e01fF61d',
          },
          '42161': {
            tokenAddress: '0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879',
          },
          '43114': {
            tokenAddress: '0x88128fd4b259552A9A1D457f435a6527AAb72d42',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xec67005c4E498Ec7f55E092bd1d35cbC47C91892',
      name: 'Melon',
      symbol: 'MLN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/605/thumb/melon.png?1547034295',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xa9f37D84c856fDa3812ad0519Dad44FA0a3Fe207',
          },
          '42161': {
            tokenAddress: '0x8f5c1A99b1df736Ad685006Cb6ADCA7B7Ae4b514',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Monavale',
      symbol: 'MONA',
      logoURI:
        'https://assets.coingecko.com/coins/images/13298/thumb/monavale_logo.jpg?1607232721',
      address: '0x275f5Ad03be0Fa221B4C6649B8AeE09a42D9412A',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x33349B282065b0284d756F0577FB39c158F935e6',
      name: 'Maple',
      symbol: 'MPL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14097/thumb/photo_2021-05-03_14.20.41.jpeg?1620022863',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0x29024832eC3baBF5074D4F46102aA988097f0Ca0',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Metal',
      symbol: 'MTL',
      logoURI:
        'https://assets.coingecko.com/coins/images/763/thumb/Metal.png?1592195010',
      address: '0xF433089366899D83a9f26A773D59ec7eCF30355e',
      decimals: 8,
    },
    {
      chainId: 1,
      address: '0x65Ef703f5594D2573eb71Aaf55BC0CB548492df4',
      name: 'Multichain',
      symbol: 'MULTI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22087/thumb/1_Wyot-SDGZuxbjdkaOeT2-A.png?1640764238',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x9Fb9a33956351cf4fa040f65A13b835A3C8764E3',
          },
          '42161': {
            tokenAddress: '0x7b9b94aebe5E2039531af8E31045f377EcD9A39A',
          },
          '43114': {
            tokenAddress: '0x9Fb9a33956351cf4fa040f65A13b835A3C8764E3',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xe2f2a5C287993345a840Db3B0845fbC70f5935a5',
      name: 'mStable USD',
      symbol: 'MUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11576/thumb/mStable_USD.png?1595591803',
    },
    {
      chainId: 1,
      name: 'Muse DAO',
      symbol: 'MUSE',
      logoURI:
        'https://assets.coingecko.com/coins/images/13230/thumb/muse_logo.png?1606460453',
      address: '0xB6Ca7399B4F9CA56FC27cBfF44F4d2e4Eef1fc81',
      decimals: 18,
    },
    {
      chainId: 1,
      name: 'GensoKishi Metaverse',
      symbol: 'MV',
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/17704.png',
      address: '0xAE788F80F2756A86aa2F410C651F2aF83639B95b',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xA3c322Ad15218fBFAEd26bA7f616249f7705D945',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'MXC',
      symbol: 'MXC',
      logoURI:
        'https://assets.coingecko.com/coins/images/4604/thumb/mxc.png?1655534336',
      address: '0x5Ca381bBfb58f0092df149bD3D243b08B9a8386e',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0x91b468Fe3dce581D7a6cFE34189F1314b6862eD6',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x9E46A38F5DaaBe8683E10793b06749EEF7D733d1',
      name: 'PolySwarm',
      symbol: 'NCT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2843/thumb/ImcYCVfX_400x400.jpg?1628519767',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x4985E0B13554fB521840e893574D3848C10Fcc6f',
          },
          '42161': {
            tokenAddress: '0x53236015A675fcB937485F1AE58040e4Fb920d5b',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Nest Protocol',
      symbol: 'NEST',
      logoURI:
        'https://assets.coingecko.com/coins/images/11284/thumb/52954052.png?1589868539',
      address: '0x04abEdA201850aC0124161F037Efd70c74ddC74C',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x98f8669F6481EbB341B522fCD3663f79A3d1A6A7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb',
      name: 'NKN',
      symbol: 'NKN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3375/thumb/nkn.png?1548329212',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0xBE06ca305A5Cb49ABf6B1840da7c42690406177b',
          },
        },
      },
    },
    {
      name: 'Numeraire',
      address: '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671',
      symbol: 'NMR',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x0Bf519071b02F22C17E7Ed5F4002ee1911f46729',
          },
          '42161': {
            tokenAddress: '0x597701b32553b9fa473e21362D480b3a6B569711',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x4fE83213D56308330EC302a8BD641f1d0113A4Cc',
      name: 'NuCypher',
      symbol: 'NU',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3318/thumb/photo1198982838879365035.jpg?1547037916',
    },
    {
      chainId: 1,
      address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
      name: 'Ocean Protocol',
      symbol: 'OCEAN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3687/thumb/ocean-protocol-logo.jpg?1547038686',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x2561aa2bB1d2Eb6629EDd7b0938d7679B8b49f9E',
          },
          '137': {
            tokenAddress: '0x282d8efCe846A88B159800bd4130ad77443Fa1A1',
          },
          '42161': {
            tokenAddress: '0x933d31561e470478079FEB9A6Dd2691fAD8234DF',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
      name: 'Origin Protocol',
      symbol: 'OGN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3296/thumb/op.jpg?1547037878',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xa63Beffd33AB3a2EfD92a39A7D2361CEE14cEbA8',
          },
          '42161': {
            tokenAddress: '0x6FEb262FEb0f775B5312D2e009923f7f58AE423E',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07',
      name: 'OMG Network',
      symbol: 'OMG',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/776/thumb/OMG_Network.jpg?1591167168',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x62414D03084EeB269E18C970a21f45D2967F0170',
          },
          '42161': {
            tokenAddress: '0xd962C1895c46AC0378C502c207748b7061421e8e',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6F59e0461Ae5E2799F1fB3847f05a63B16d0DbF8',
      name: 'ORCA Alliance',
      symbol: 'ORCA',
      decimals: 18,
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5183.png',
    },
    {
      chainId: 1,
      address: '0x0258F474786DdFd37ABCE6df6BBb1Dd5dfC4434a',
      name: 'Orion Protocol',
      symbol: 'ORN',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/11841/thumb/orion_logo.png?1594943318',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x0EE392bA5ef1354c9bd75a98044667d307C0e773',
          },
          '42161': {
            tokenAddress: '0x1BDCC2075d5370293E248Cab0173eC3E551e6218',
          },
        },
      },
    },
    {
      name: 'Orchid',
      address: '0x4575f41308EC1483f3d399aa9a2826d74Da13Deb',
      symbol: 'OXT',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x4575f41308EC1483f3d399aa9a2826d74Da13Deb/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x9880e3dDA13c8e7D4804691A45160102d31F6060',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xc1D204d77861dEf49b6E769347a883B15EC397Ff',
      name: 'PayperEx',
      symbol: 'PAX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1601/thumb/pax.png?1547035800',
    },
    {
      chainId: 1,
      address: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
      name: 'PAX Gold',
      symbol: 'PAXG',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9519/thumb/paxg.PNG?1568542565',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x553d3D295e0f695B9228246232eDF400ed3560B5',
          },
          '42161': {
            tokenAddress: '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      name: 'Pepe',
      symbol: 'PEPE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1682922725',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xC1c167CC44f7923cd0062c4370Df962f9DDB16f5',
          },
          '42161': {
            tokenAddress: '0x35E6A59F786d9266c7961eA28c7b768B33959cbB',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xbC396689893D065F41bc2C6EcbeE5e0085233447',
      name: 'Perpetual Protocol',
      symbol: 'PERP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12381/thumb/60d18e06844a844ad75901a9_mark_only_03.png?1628674771',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
          },
          '56': {
            tokenAddress: '0x4e7f408be2d4E9D60F49A64B89Bb619c84C7c6F5',
          },
          '137': {
            tokenAddress: '0x263534a4Fe3cb249dF46810718B7B612a30ebbff',
          },
          '42161': {
            tokenAddress: '0x753D224bCf9AAFaCD81558c32341416df61D3DAC',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3a4f40631a4f906c2BaD353Ed06De7A5D3fCb430',
      name: 'PlayDapp',
      symbol: 'PLA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14316/thumb/54023228.png?1615366911',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x8765f05ADce126d70bcdF1b0a48Db573316662eB',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xD8912C10681D8B21Fd3742244f44658dBA12264E',
      name: 'Pluton',
      symbol: 'PLU',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1241/thumb/pluton.png?1548331624',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x7dc0cb65EC6019330a6841e9c274f2EE57A6CA6C',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x83e6f1E41cdd28eAcEB20Cb649155049Fac3D5Aa',
      name: 'Polkastarter',
      symbol: 'POLS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12648/thumb/polkastarter.png?1609813702',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x7e624FA0E1c4AbFD309cC15719b7E2580887f570',
          },
          '137': {
            tokenAddress: '0x8dc302e2141DA59c934d900886DbF1518Fd92cd4',
          },
          '42161': {
            tokenAddress: '0xeeeB5EaC2dB7A7Fc28134aA3248580d48b016b64',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x9992eC3cF6A55b00978cdDF2b27BC6882d88D1eC',
      name: 'Polymath',
      symbol: 'POLY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2784/thumb/inKkF01.png?1605007034',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xcB059C5573646047D6d88dDdb87B745C18161d3b',
          },
          '42161': {
            tokenAddress: '0xE12F29704F635F4A6E7Ae154838d21F9B33809e9',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Marlin',
      symbol: 'POND',
      logoURI:
        'https://assets.coingecko.com/coins/images/8903/thumb/POND_200x200.png?1622515451',
      address: '0x57B946008913B82E4dF85f501cbAeD910e58D26C',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x73580A2416A57f1C4b6391DBA688A9e4f7DBECE0',
          },
          '42161': {
            tokenAddress: '0xdA0a57B710768ae17941a9Fa33f8B720c8bD9ddD',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x595832F8FC6BF59c85C527fEC3740A1b7a361269',
      name: 'Power Ledger',
      symbol: 'POWR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/1104/thumb/power-ledger.png?1547035082',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x0AaB8DC887D34f00D50E19aee48371a941390d14',
          },
          '42161': {
            tokenAddress: '0x4e91F2AF1ee0F84B529478f19794F5AFD423e4A6',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xb23d80f5FefcDDaa212212F028021B41DEd428CF',
      name: 'Prime',
      symbol: 'PRIME',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/29053/large/PRIMELOGOOO.png?1676976222',
      extensions: {
        bridgeInfo: {
          '8453': {
            tokenAddress: '0xfA980cEd6895AC314E7dE34Ef1bFAE90a5AdD21b',
          },
          '42161': {
            tokenAddress: '0x8d8e1b6ffc6832E8D2eF0DE8a3d957cAE7ac5067',
          },
          '84531': {
            tokenAddress: '0x121dAEb77cFbC6a9CfC691Da4F5E97c8Bd02518F',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x226bb599a12C826476e3A771454697EA52E9E220',
      name: 'Propy',
      symbol: 'PRO',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/869/thumb/propy.png?1548332100',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x82FFdFD1d8699E8886a4e77CeFA9dd9710a7FefD',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'PARSIQ',
      symbol: 'PRQ',
      logoURI:
        'https://assets.coingecko.com/coins/images/11973/thumb/DsNgK0O.png?1596590280',
      address: '0x362bc847A3a9637d3af6624EeC853618a43ed7D2',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xd21d29B38374528675C34936bf7d5Dd693D2a577',
          },
          '137': {
            tokenAddress: '0x9377Eeb7419486FD4D485671d50baa4BF77c2222',
          },
          '42161': {
            tokenAddress: '0x82164a8B646401a8776F9dC5c8Cba35DcAf60Cd2',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'pSTAKE Finance',
      symbol: 'PSTAKE',
      logoURI:
        'https://assets.coingecko.com/coins/images/23931/thumb/PSTAKE_Dark.png?1645709930',
      address: '0xfB5c6815cA3AC72Ce9F5006869AE67f18bF77006',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x4C882ec256823eE773B25b414d36F92ef58a7c0C',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
      name: 'PayPal USD',
      symbol: 'PYUSD',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/31212/large/PYUSD_Logo_%282%29.png?1691458314',
    },
    {
      chainId: 1,
      address: '0x4a220E6096B25EADb88358cb44068A3248254675',
      name: 'Quant',
      symbol: 'QNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3370/thumb/5ZOu7brX_400x400.jpg?1612437252',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x36B77a184bE8ee56f5E81C56727B20647A42e28E',
          },
          '42161': {
            tokenAddress: '0xC7557C73e0eCa2E1BF7348bB6874Aee63C7eFF85',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Qredo',
      symbol: 'QRDO',
      logoURI:
        'https://assets.coingecko.com/coins/images/17541/thumb/qrdo.png?1630637735',
      address: '0x4123a133ae3c521FD134D7b13A2dEC35b56c2463',
      decimals: 8,
    },
    {
      chainId: 1,
      address: '0x99ea4dB9EE77ACD40B119BD1dC4E33e1C070b80d',
      name: 'Quantstamp',
      symbol: 'QSP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1219/thumb/0_E0kZjb4dG4hUnoDD_.png?1604815917',
    },
    {
      chainId: 1,
      address: '0x6c28AeF8977c9B773996d0e8376d2EE379446F2f',
      name: 'Quickswap',
      symbol: 'QUICK',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13970/thumb/1_pOU6pBMEmiL-ZJVb0CYRjQ.png?1613386659',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x831753DD7087CaC61aB5644b308642cc1c33Dc13',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x31c8EAcBFFdD875c74b94b077895Bd78CF1E64A3',
      name: 'Radicle',
      symbol: 'RAD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14013/thumb/radicle.png?1614402918',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x2f81e176471CC57fDC76f7d332FB4511bF2bebDD',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919',
      name: 'Rai Reflex Index',
      symbol: 'RAI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14004/thumb/RAI-logo-coin.png?1613592334',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x7FB688CCf682d58f86D7e38e03f9D22e7705448B',
          },
          '137': {
            tokenAddress: '0x00e5646f60AC6Fb446f621d146B6E1886f002905',
          },
          '42161': {
            tokenAddress: '0xaeF5bbcbFa438519a5ea80B4c7181B4E78d419f2',
          },
          '43114': {
            tokenAddress: '0x97Cd1CFE2ed5712660bb6c14053C0EcB031Bff7d',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xba5BDe662c17e2aDFF1075610382B9B691296350',
      name: 'SuperRare',
      symbol: 'RARE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17753/thumb/RARE.jpg?1629220534',
    },
    {
      chainId: 1,
      address: '0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF',
      name: 'Rarible',
      symbol: 'RARI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11845/thumb/Rari.png?1594946953',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x780053837cE2CeEaD2A90D9151aA21FC89eD49c2',
          },
          '42161': {
            tokenAddress: '0xCF8600347Dc375C5f2FdD6Dab9BB66e0b6773cd7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xA4EED63db85311E22dF4473f87CcfC3DaDCFA3E3',
      name: 'Rubic',
      symbol: 'RBC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12629/thumb/200x200.png?1607952509',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xc3cFFDAf8F3fdF07da6D5e3A89B8723D5E385ff8',
          },
          '42161': {
            tokenAddress: '0x2E9AE8f178d5Ea81970C7799A377B3985cbC335F',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6123B0049F904d730dB3C36a31167D9d4121fA6B',
      name: 'Ribbon Finance',
      symbol: 'RBN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15823/thumb/RBN_64x64.png?1633529723',
    },
    {
      name: 'Republic Token',
      address: '0x408e41876cCCDC0F92210600ef50372656052a38',
      symbol: 'REN',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x408e41876cCCDC0F92210600ef50372656052a38/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x19782D3Dc4701cEeeDcD90f0993f0A9126ed89d0',
          },
          '42161': {
            tokenAddress: '0x9fA891e1dB0a6D1eEAC4B929b5AAE1011C79a204',
          },
        },
      },
    },
    {
      name: 'Reputation Augur v1',
      address: '0x1985365e9f78359a9B6AD760e32412f4a445E862',
      symbol: 'REP',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1985365e9f78359a9B6AD760e32412f4a445E862/logo.png',
    },
    {
      name: 'Reputation Augur v2',
      address: '0x221657776846890989a759BA2973e427DfF5C9bB',
      symbol: 'REPv2',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x221657776846890989a759BA2973e427DfF5C9bB/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x6563c1244820CfBd6Ca8820FBdf0f2847363F733',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x8f8221aFbB33998d8584A2B05749bA73c37a938a',
      name: 'Request',
      symbol: 'REQ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1031/thumb/Request_icon_green.png?1643250951',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xAdf2F2Ed91755eA3f4bcC9107a494879f633ae7C',
          },
          '42161': {
            tokenAddress: '0x1Cb5bBc64e148C5b889E3c667B49edF78BB92171',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'REVV',
      symbol: 'REVV',
      logoURI:
        'https://assets.coingecko.com/coins/images/12373/thumb/REVV_TOKEN_Refined_2021_%281%29.png?1627652390',
      address: '0x557B933a7C2c45672B610F8954A3deB39a51A8Ca',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x833F307aC507D47309fD8CDD1F835BeF8D702a93',
          },
          '137': {
            tokenAddress: '0x70c006878a5A50Ed185ac4C87d837633923De296',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xD291E7a03283640FDc51b121aC401383A46cC623',
      name: 'Rari Governance Token',
      symbol: 'RGT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12900/thumb/Rari_Logo_Transparent.png?1613978014',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xB548f63D4405466B36C0c0aC3318a22fDcec711a',
          },
          '137': {
            tokenAddress: '0x3b9dB434F08003A89554CDB43b3e0b1f8734BdE7',
          },
          '42161': {
            tokenAddress: '0xef888bcA6AB6B1d26dbeC977C455388ecd794794',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x607F4C5BB672230e8672085532f7e901544a7375',
      name: 'iExec RLC',
      symbol: 'RLC',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/646/thumb/pL1VuXm.png?1604543202',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xbe662058e00849C3Eef2AC9664f37fEfdF2cdbFE',
          },
          '42161': {
            tokenAddress: '0xE575586566b02A16338c199c23cA6d295D794e66',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xf1f955016EcbCd7321c7266BccFB96c68ea5E49b',
      name: 'Rally',
      symbol: 'RLY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12843/thumb/image.png?1611212077',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x76b8D57e5ac6afAc5D415a054453d1DD2c3C0094',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24',
      name: 'Render Token',
      symbol: 'RNDR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11636/thumb/rndr.png?1638840934',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x61299774020dA444Af134c82fa83E3810b309991',
          },
          '42161': {
            tokenAddress: '0xC8a4EeA31E9B6b61c406DF013DD4FEc76f21E279',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Rook',
      symbol: 'ROOK',
      logoURI:
        'https://assets.coingecko.com/coins/images/13005/thumb/keeper_dao_logo.jpg?1604316506',
      address: '0xfA5047c9c78B8877af97BDcb85Db743fD7313d4a',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xF92501c8213da1D6C74A76372CCc720Dc8818407',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
      name: 'The Sandbox',
      symbol: 'SAND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12129/thumb/sandbox_logo.jpg?1597397942',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683',
          },
          '42161': {
            tokenAddress: '0xd1318eb19DBF2647743c720ed35174efd64e3DAC',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
      name: 'Shiba Inu',
      symbol: 'SHIB',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11939/thumb/shiba.png?1622619446',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec',
          },
          '42161': {
            tokenAddress: '0x5033833c9fe8B9d3E09EEd2f73d2aaF7E3872fd1',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x7C84e62859D0715eb77d1b1C4154Ecd6aBB21BEC',
      name: 'Shping',
      symbol: 'SHPING',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2588/thumb/r_yabKKi_400x400.jpg?1639470164',
    },
    {
      chainId: 1,
      address: '0x00c83aeCC790e8a4453e5dD3B0B4b3680501a7A7',
      name: 'SKALE',
      symbol: 'SKL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13245/thumb/SKALE_token_300x300.png?1606789574',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0x4F9b7DEDD8865871dF65c5D26B1c2dD537267878',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xCC8Fa225D80b9c7D42F96e9570156c65D6cAAa25',
      name: 'Smooth Love Potion',
      symbol: 'SLP',
      decimals: 0,
      logoURI:
        'https://assets.coingecko.com/coins/images/10366/thumb/SLP.png?1578640057',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x0C7304fBAf2A320a1c50c46FE03752722F729946',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x744d70FDBE2Ba4CF95131626614a1763DF805B9E',
      name: 'Status',
      symbol: 'SNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/779/thumb/status.png?1548610778',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x650AF3C15AF43dcB218406d30784416D64Cfb6B2',
          },
          '42161': {
            tokenAddress: '0x707F635951193dDaFBB40971a0fCAAb8A6415160',
          },
        },
      },
    },
    {
      name: 'Synthetix Network Token',
      address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
      symbol: 'SNX',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
          },
          '137': {
            tokenAddress: '0x50B728D8D964fd00C2d0AAD81718b71311feF68a',
          },
          '8453': {
            tokenAddress: '0x22e6966B799c4D5B13BE962E1D117b56327FDa66',
          },
          '42161': {
            tokenAddress: '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60',
          },
          '43114': {
            tokenAddress: '0xBeC243C995409E6520D7C41E404da5dEba4b209B',
          },
          '84531': {
            tokenAddress: '0x6AF3cb766D6cd37449bfD321D961A61B0515c1BC',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x23B608675a2B2fB1890d3ABBd85c5775c51691d5',
      name: 'Unisocks',
      symbol: 'SOCKS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/10717/thumb/qFrcoiM.png?1582525244',
      extensions: {
        bridgeInfo: {
          '42161': {
            tokenAddress: '0xb2BE52744a804Cc732d606817C2572C5A3B264e7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
      name: 'SOL Wormhole ',
      symbol: 'SOL',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/22876/thumb/SOL_wh_small.png?1644224316',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xba1Cf949c382A32a09A17B2AdF3587fc7fA664f1',
          },
          '56': {
            tokenAddress: '0xfA54fF1a158B5189Ebba6ae130CEd6bbd3aEA76e',
          },
          '42161': {
            tokenAddress: '0xb74Da9FE2F96B9E0a5f4A3cf0b92dd2bEC617124',
          },
          '43114': {
            tokenAddress: '0xFE6B19286885a4F7F55AdAD09C3Cd1f906D2478F',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x090185f2135308BaD17527004364eBcC2D37e5F6',
      name: 'Spell Token',
      symbol: 'SPELL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15861/thumb/abracadabra-3.png?1622544862',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xcdB3C70CD25FD15307D84C4F9D37d5C043B33Fb2',
          },
          '42161': {
            tokenAddress: '0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF',
          },
          '43114': {
            tokenAddress: '0xCE1bFFBD5374Dac86a2893119683F4911a2F7814',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Stargate Finance',
      symbol: 'STG',
      logoURI:
        'https://assets.coingecko.com/coins/images/24413/thumb/STG_LOGO.png?1647654518',
      address: '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
          },
          '42161': {
            tokenAddress: '0xe018C7a3d175Fb0fE15D70Da2c874d3CA16313EC',
          },
          '43114': {
            tokenAddress: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
          },
        },
      },
    },
    {
      name: 'Storj Token',
      address: '0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC',
      symbol: 'STORJ',
      decimals: 8,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC/logo.png',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xd72357dAcA2cF11A5F155b9FF7880E595A3F5792',
          },
          '42161': {
            tokenAddress: '0xE6320ebF209971b4F4696F7f0954b8457Aa2FCC2',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x006BeA43Baa3f7A6f765F14f10A1a1b08334EF45',
      name: 'Stox',
      symbol: 'STX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1230/thumb/stox-token.png?1547035256',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xB36e3391B22a970d31A9b620Ae1A414C6c256d2a',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x0763fdCCF1aE541A5961815C0872A8c5Bc6DE4d7',
      name: 'SUKU',
      symbol: 'SUKU',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11969/thumb/UmfW5S6f_400x400.jpg?1596602238',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xEf6301DA234fC7b0545c6E877D3359FE0B9E50a4',
          },
          '137': {
            tokenAddress: '0x60Ea918FC64360269Da4efBDA11d8fC6514617C6',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xe53EC727dbDEB9E2d5456c3be40cFF031AB40A55',
      name: 'SuperFarm',
      symbol: 'SUPER',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14040/thumb/6YPdWn6.png?1613975899',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x51BA0b044d96C3aBfcA52B64D733603CCC4F0d4D',
          },
          '137': {
            tokenAddress: '0xa1428174F516F527fafdD146b883bB4428682737',
          },
          '42161': {
            tokenAddress: '0x7f9cf5a2630a0d58567122217dF7609c26498956',
          },
        },
      },
    },
    {
      name: 'Synth sUSD',
      address: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
      symbol: 'sUSD',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/5013/thumb/sUSD.png?1616150765',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
          },
          '137': {
            tokenAddress: '0xF81b4Bec6Ca8f9fe7bE01CA734F55B2b6e03A7a0',
          },
          '42161': {
            tokenAddress: '0xA970AF1a584579B618be4d69aD6F73459D112F95',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
      name: 'Sushi',
      symbol: 'SUSHI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12271/thumb/512x512_Logo_no_chop.png?1606986688',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x3eaEb77b03dBc0F6321AE1b72b2E9aDb0F60112B',
          },
          '56': {
            tokenAddress: '0x947950BcC74888a40Ffa2593C5798F11Fc9124C4',
          },
          '137': {
            tokenAddress: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
          },
          '8453': {
            tokenAddress: '0x7D49a065D17d6d4a55dc13649901fdBB98B2AFBA',
          },
          '42161': {
            tokenAddress: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
          },
          '43114': {
            tokenAddress: '0x37B608519F91f70F2EeB0e5Ed9AF4061722e4F76',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'SWFTCOIN',
      symbol: 'SWFTC',
      logoURI:
        'https://assets.coingecko.com/coins/images/2346/thumb/SWFTCoin.jpg?1618392022',
      address: '0x0bb217E40F8a5Cb79Adf04E1aAb60E5abd0dfC1e',
      decimals: 8,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xE64E30276C2F826FEbd3784958d6Da7B55DfbaD3',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Swipe',
      symbol: 'SXP',
      logoURI:
        'https://assets.coingecko.com/coins/images/9368/thumb/swipe.png?1566792311',
      address: '0x8CE9137d39326AD0cD6491fb5CC0CbA0e089b6A9',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A',
          },
          '137': {
            tokenAddress: '0x6aBB753C1893194DE4a83c6e8B4EadFc105Fd5f5',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Sylo',
      symbol: 'SYLO',
      logoURI:
        'https://assets.coingecko.com/coins/images/6430/thumb/SYLO.svg?1589527756',
      address: '0xf293d23BF2CDc05411Ca0edDD588eb1977e8dcd4',
      decimals: 18,
    },
    {
      chainId: 1,
      address: '0x0f2D719407FdBeFF09D87557AbB7232601FD9F29',
      name: 'Synapse',
      symbol: 'SYN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18024/thumb/syn.png?1635002049',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xa4080f1778e69467E905B8d6F72f6e441f9e9484',
          },
          '42161': {
            tokenAddress: '0x1bCfc0B4eE1471674cd6A9F6B363A034375eAD84',
          },
          '43114': {
            tokenAddress: '0x1f1E7c893855525b303f99bDF5c3c05Be09ca251',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Threshold Network',
      symbol: 'T',
      logoURI:
        'https://assets.coingecko.com/coins/images/22228/thumb/nFPNiSbL_400x400.jpg?1641220340',
      address: '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x747e42Eb0591547a0ab429B3627816208c734EA7',
          },
          '42161': {
            tokenAddress: '0x0945Cae3ae47cb384b2d47BC448Dc6A9dEC21F55',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
      name: 'tBTC',
      symbol: 'tBTC',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x18084fbA666a33d37592fA2633fD49a74DD93a88/logo.png',
      extensions: {
        bridgeInfo: {
          '8453': {
            tokenAddress: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
          },
          '42161': {
            tokenAddress: '0x7E2a1eDeE171C5B19E6c54D73752396C0A572594',
          },
          '84531': {
            tokenAddress: '0x783349cd20f26CE12e747b1a17bC38D252c9e119',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'ChronoTech',
      symbol: 'TIME',
      logoURI:
        'https://assets.coingecko.com/coins/images/604/thumb/time-32x32.png?1627130666',
      address: '0x485d17A6f1B8780392d53D64751824253011A260',
      decimals: 8,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x3b198e26E473b8faB2085b37978e36c9DE5D7f68',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Alien Worlds',
      symbol: 'TLM',
      logoURI:
        'https://assets.coingecko.com/coins/images/14676/thumb/kY-C4o7RThfWrDQsLCAG4q4clZhBDDfJQVhWUEKxXAzyQYMj4Jmq1zmFwpRqxhAJFPOa0AsW_PTSshoPuMnXNwq3rU7Imp15QimXTjlXMx0nC088mt1rIwRs75GnLLugWjSllxgzvQ9YrP4tBgclK4_rb17hjnusGj_c0u2fx0AvVokjSNB-v2poTj0xT9BZRCbzRE3-lF1.jpg?1617700061',
      address: '0x888888848B652B3E3a0f34c96E00EEC0F3a23F72',
      decimals: 4,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x2222227E22102Fe3322098e4CBfE18cFebD57c95',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x2e9d63788249371f1DFC918a52f8d799F4a38C94',
      name: 'Tokemak',
      symbol: 'TOKE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17495/thumb/tokemak-avatar-200px-black.png?1628131614',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xe1708AbDE4847B4929b70547E5197F1Ba1db2250',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'TE FOOD',
      symbol: 'TONE',
      logoURI:
        'https://assets.coingecko.com/coins/images/2325/thumb/tec.png?1547036538',
      address: '0x2Ab6Bb8408ca3199B8Fa6C92d5b455F820Af03c4',
      decimals: 18,
    },
    {
      chainId: 1,
      address: '0xaA7a9CA87d3694B5755f213B5D04094b8d0F0A6F',
      name: 'OriginTrail',
      symbol: 'TRAC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1877/thumb/TRAC.jpg?1635134367',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xA7b98d63a137bF402b4570799ac4caD0BB1c4B1c',
          },
          '8453': {
            tokenAddress: '0xA81a52B4dda010896cDd386C7fBdc5CDc835ba23',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0',
      name: 'Tellor',
      symbol: 'TRB',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9644/thumb/Blk_icon_current.png?1584980686',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xaf8cA653Fa2772d58f4368B0a71980e9E3cEB888',
          },
          '137': {
            tokenAddress: '0xE3322702BEdaaEd36CdDAb233360B939775ae5f1',
          },
          '42161': {
            tokenAddress: '0xd58D345Fd9c82262E087d2D0607624B410D88242',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B',
      name: 'Tribe',
      symbol: 'TRIBE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14575/thumb/tribe.PNG?1617487954',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x8676815789211E799a6DC86d02748ADF9cF86836',
          },
          '42161': {
            tokenAddress: '0xBfAE6fecD8124ba33cbB2180aAb0Fe4c03914A5A',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x4C19596f5aAfF459fA38B0f7eD92F11AE6543784',
      name: 'TrueFi',
      symbol: 'TRU',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/13180/thumb/truefi_glyph_color.png?1617610941',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x5b77bCA482bd3E7958b1103d123888EfCCDaF803',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'The Virtua Kolect',
      symbol: 'TVK',
      logoURI:
        'https://assets.coingecko.com/coins/images/13330/thumb/virtua_original.png?1656043619',
      address: '0xd084B83C305daFD76AE3E1b4E1F1fe2eCcCb3988',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x5667dcC0ab74D1b1355C3b2061893399331B57e2',
          },
        },
      },
    },
    {
      name: 'UMA Voting Token v1',
      address: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
      symbol: 'UMA',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea',
          },
          '137': {
            tokenAddress: '0x3066818837c5e6eD6601bd5a91B0762877A6B731',
          },
          '42161': {
            tokenAddress: '0xd693Ec944A85eeca4247eC1c3b130DCa9B0C3b22',
          },
          '43114': {
            tokenAddress: '0x3Bd2B1c7ED8D396dbb98DED3aEbb41350a5b2339',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x441761326490cACF7aF299725B6292597EE822c2',
      name: 'Unifi Protocol DAO',
      symbol: 'UNFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13152/thumb/logo-2.png?1605748967',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x728C5baC3C3e370E372Fc4671f9ef6916b814d8B',
          },
        },
      },
    },
    {
      name: 'Uniswap',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      decimals: 18,
      chainId: 1,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
          },
          '56': {
            tokenAddress: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
          },
          '137': {
            tokenAddress: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
          },
          '42161': {
            tokenAddress: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
          },
          '43114': {
            tokenAddress: '0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x70D2b7C19352bB76e4409858FF5746e500f2B67c',
      name: 'Pawtocol',
      symbol: 'UPI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12186/thumb/pawtocol.jpg?1597962008',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x0D35A2B85c5A63188d566D104bEbf7C694334Ee4',
          },
        },
      },
    },
    {
      name: 'USDCoin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      decimals: 6,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
          },
          '56': {
            tokenAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          },
          '137': {
            tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          },
          '8453': {
            tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          },
          '42161': {
            tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          },
          '43114': {
            tokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          },
          '84531': {
            tokenAddress: '0xF175520C52418dfE19C8098071a252da48Cd1C19',
          },
        },
      },
    },
    {
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      decimals: 6,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
          },
          '56': {
            tokenAddress: '0x55d398326f99059fF775485246999027B3197955',
          },
          '137': {
            tokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          },
          '42161': {
            tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
          },
          '43114': {
            tokenAddress: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x3C4B6E6e1eA3D4863700D7F76b36B7f3D3f13E3d',
      name: 'Voyager Token',
      symbol: 'VGX',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/794/thumb/Voyager-vgx.png?1575693595',
    },
    {
      chainId: 1,
      name: 'Wrapped Ampleforth',
      symbol: 'WAMPL',
      logoURI:
        'https://assets.coingecko.com/coins/images/20825/thumb/photo_2021-11-25_02-05-11.jpg?1637811951',
      address: '0xEDB171C18cE90B633DB442f2A6F72874093b49Ef',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '8453': {
            tokenAddress: '0x489fe42C267fe0366B16b0c39e7AEEf977E841eF',
          },
          '42161': {
            tokenAddress: '0x1c8Ec4DE3c2BFD3050695D89853EC6d78AE650bb',
          },
          '84531': {
            tokenAddress: '0x395Ae52bB17aef68C2888d941736A71dC6d4e125',
          },
        },
      },
    },
    {
      name: 'Wrapped BTC',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      decimals: 8,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
          },
          '137': {
            tokenAddress: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
          },
          '42161': {
            tokenAddress: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
          },
          '43114': {
            tokenAddress: '0x50b7545627a5162F82A992c33b87aDc75187B218',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Wrapped Centrifuge',
      symbol: 'WCFG',
      logoURI:
        'https://assets.coingecko.com/coins/images/17106/thumb/WCFG.jpg?1626266462',
      address: '0xc221b7E65FfC80DE234bbB6667aBDd46593D34F0',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x90bb6fEB70A9a43CfAaA615F856BA309FD759A90',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x4200000000000000000000000000000000000006',
          },
          '56': {
            tokenAddress: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
          },
          '137': {
            tokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
          },
          '8453': {
            tokenAddress: '0x4200000000000000000000000000000000000006',
          },
          '42161': {
            tokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          },
          '42220': {
            tokenAddress: '0x2DEf4285787d58a2f811AF24755A8150622f4361',
          },
          '43114': {
            tokenAddress: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
          },
          '84531': {
            tokenAddress: '0x4200000000000000000000000000000000000006',
          },
        },
      },
    },

    {
      chainId: 1,
      name: 'WOO Network',
      symbol: 'WOO',
      logoURI:
        'https://assets.coingecko.com/coins/images/12921/thumb/w2UiemF__400x400.jpg?1603670367',
      address: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x871f2F2ff935FD1eD867842FF2a7bfD051A5E527',
          },
          '56': {
            tokenAddress: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
          },
          '137': {
            tokenAddress: '0x1B815d120B3eF02039Ee11dC2d33DE7aA4a8C603',
          },
          '42161': {
            tokenAddress: '0xcAFcD85D8ca7Ad1e1C6F82F651fA15E33AEfD07b',
          },
          '43114': {
            tokenAddress: '0xaBC9547B534519fF73921b1FBA6E672b5f58D083',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Chain',
      symbol: 'XCN',
      logoURI:
        'https://assets.coingecko.com/coins/images/24210/thumb/Chain_icon_200x200.png?1646895054',
      address: '0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0x7324c7C0d95CEBC73eEa7E85CbAac0dBdf88a05b',
          },
          '42161': {
            tokenAddress: '0x58BbC087e36Db40a84b22c1B93a042294deEAFEd',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96',
      name: 'XSGD',
      symbol: 'XSGD',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/12832/standard/StraitsX_Singapore_Dollar_%28XSGD%29_Token_Logo.png?1696512623',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xDC3326e71D45186F113a2F448984CA0e8D201995',
          },
          '42161': {
            tokenAddress: '0xa05245Ade25cC1063EE50Cf7c083B4524c1C4302',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x55296f69f40Ea6d20E478533C15A6B08B654E758',
      name: 'XYO Network',
      symbol: 'XYO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4519/thumb/XYO_Network-logo.png?1547039819',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xd2507e7b5794179380673870d88B22F94da6abe0',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
      name: 'yearn finance',
      symbol: 'YFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png?1598325330',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0x9046D36440290FfDE54FE0DD84Db8b1CfEE9107B',
          },
          '137': {
            tokenAddress: '0xDA537104D6A5edd53c6fBba9A898708E465260b6',
          },
          '8453': {
            tokenAddress: '0x9EaF8C1E34F05a589EDa6BAfdF391Cf6Ad3CB239',
          },
          '42161': {
            tokenAddress: '0x82e3A8F066a6989666b031d916c43672085b1582',
          },
          '43114': {
            tokenAddress: '0x9eAaC1B23d935365bD7b542Fe22cEEe2922f52dc',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xa1d0E215a23d7030842FC67cE582a6aFa3CCaB83',
      name: 'DFI money',
      symbol: 'YFII',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11902/thumb/YFII-logo.78631676.png?1598677348',
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0xb8cb8a7F4C2885C03e57E973C74827909Fdc2032',
          },
        },
      },
    },
    {
      chainId: 1,
      name: 'Yield Guild Games',
      symbol: 'YGG',
      logoURI:
        'https://assets.coingecko.com/coins/images/17358/thumb/le1nzlO6_400x400.jpg?1632465691',
      address: '0x25f8087EAD173b73D6e8B84329989A8eEA16CF73',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '137': {
            tokenAddress: '0x82617aA52dddf5Ed9Bb7B370ED777b3182A30fd1',
          },
        },
      },
    },
    {
      name: '0x Protocol Token',
      address: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
      symbol: 'ZRX',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xE41d2489571d322189246DaFA5ebDe1F4699F498/logo.png',
      extensions: {
        bridgeInfo: {
          '10': {
            tokenAddress: '0xD1917629B3E6A72E6772Aab5dBe58Eb7FA3C2F33',
          },
          '137': {
            tokenAddress: '0x5559Edb74751A0edE9DeA4DC23aeE72cCA6bE3D5',
          },
          '8453': {
            tokenAddress: '0x3bB4445D30AC020a84c1b5A8A2C6248ebC9779D0',
          },
          '42161': {
            tokenAddress: '0xBD591Bd4DdB64b77B5f76Eab8f03d02519235Ae2',
          },
          '43114': {
            tokenAddress: '0x596fA47043f99A4e0F122243B841E55375cdE0d2',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0xaD6D458402F60fD3Bd25163575031ACDce07538D',
      symbol: 'DAI',
      decimals: 18,
      chainId: 3,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xaD6D458402F60fD3Bd25163575031ACDce07538D/logo.png',
    },
    {
      name: 'Uniswap',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      decimals: 18,
      chainId: 3,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
    },
    {
      name: 'Wrapped Ether',
      address: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
      symbol: 'WETH',
      decimals: 18,
      chainId: 3,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc778417E063141139Fce010982780140Aa0cD5Ab/logo.png',
    },
    {
      name: 'Dai Stablecoin',
      address: '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735',
      symbol: 'DAI',
      decimals: 18,
      chainId: 4,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735/logo.png',
    },
    {
      name: 'Maker',
      address: '0xF9bA5210F91D0474bd1e1DcDAeC4C58E359AaD85',
      symbol: 'MKR',
      decimals: 18,
      chainId: 4,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xF9bA5210F91D0474bd1e1DcDAeC4C58E359AaD85/logo.png',
    },
    {
      name: 'Uniswap',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      decimals: 18,
      chainId: 4,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
    },
    {
      name: 'Wrapped Ether',
      address: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
      symbol: 'WETH',
      decimals: 18,
      chainId: 4,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc778417E063141139Fce010982780140Aa0cD5Ab/logo.png',
    },
    {
      name: 'Uniswap',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      decimals: 18,
      chainId: 5,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
    },
    {
      name: 'Wrapped Ether',
      address: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      symbol: 'WETH',
      decimals: 18,
      chainId: 5,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6/logo.png',
    },
    {
      chainId: 10,
      address: '0xAd42D013ac31486B73b6b059e748172994736426',
      name: '1inch',
      symbol: '1INCH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
      name: 'Aave',
      symbol: 'AAVE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x334cc734866E97D8452Ae6261d68Fd9bc9BFa31E',
      name: 'ARPA Chain',
      symbol: 'ARPA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8506/thumb/9u0a23XY_400x400.jpg?1559027357',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBA50933C268F567BDC86E1aC131BE072C6B0b71a',
          },
        },
      },
    },
    {
      name: 'Balancer',
      address: '0xFE8B128bA8C78aabC59d4c64cEE7fF28e9379921',
      symbol: 'BAL',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xba100000625a3754423978a60c9317c58a424e3D/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3D',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x3e7eF8f50246f725885102E8238CBba33F276747',
      name: 'BarnBridge',
      symbol: 'BOND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12811/thumb/barnbridge.jpg?1602728853',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0391D2021f89DC339F60Fff84546EA23E337750f',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xEd50aCE88bd42B45cB0F49be15395021E141254e',
      name: 'Braintrust',
      symbol: 'BTRST',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18100/thumb/braintrust.PNG?1630475394',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x799ebfABE77a6E34311eeEe9825190B9ECe32824',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39',
      name: 'Binance USD',
      symbol: 'BUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9576/thumb/BUSD.png?1568947766',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xadDb6A0412DE1BA0F936DCaeb8Aaa24578dcF3B2',
      name: 'Coinbase Wrapped Staked ETH',
      symbol: 'cbETH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/27008/large/cbeth.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x9b88D293b7a791E40d36A39765FFd5A1B9b5c349',
      name: 'Celo native asset (Wormhole)',
      symbol: 'CELO',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/wormhole-foundation/wormhole-token-list/main/assets/celo_wh.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3294395e62F4eB6aF3f1Fcf89f5602D90Fb3Ef69',
          },
        },
      },
    },
    {
      name: 'Curve DAO Token',
      address: '0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53',
      symbol: 'CRV',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD533a949740bb3306d119CC777fa900bA034cd52/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xEc6adef5E1006bb305bB1975333e8fc4071295bf',
      name: 'Cartesi',
      symbol: 'CTSI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11038/thumb/cartesi.png?1592288021',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      symbol: 'DAI',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x65559aA14915a70190438eF90104769e5E890A00',
      name: 'Ethereum Name Service',
      symbol: 'ENS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19785/thumb/acatxTm8_400x400.jpg?1635850140',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xD8737CA46aa6285dE7B8777a8e3db232911baD41',
      name: 'Stafi',
      symbol: 'FIS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12423/thumb/stafi_logo.jpg?1599730991',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xef3A930e1FfFFAcd2fc13434aC81bD278B0ecC8d',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xF1a0DA3367BC7aa04F8D94BA57B862ff37CeD174',
      name: 'ShapeShift FOX Token',
      symbol: 'FOX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9988/thumb/FOX.png?1574330622',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
      name: 'First Digital USD',
      symbol: 'FDUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/31079/thumb/firstfigital.jpeg?1696529912',
      extensions: {
        bridgeInfo: {
          '56': {
            tokenAddress: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
      name: 'First Digital USD',
      symbol: 'FDUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/31079/thumb/firstfigital.jpeg?1696529912',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475',
      name: 'Frax',
      symbol: 'FRAX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13422/thumb/frax_logo.png?1608476506',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x67CCEA5bb16181E7b4109c9c2143c24a1c2205Be',
      name: 'Frax Share',
      symbol: 'FXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13423/thumb/frax_share.png?1608478989',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x1EBA7a6a72c894026Cd654AC5CDCF83A46445B08',
      name: 'Gitcoin',
      symbol: 'GTC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15810/thumb/gitcoin.png?1621992929',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x589d35656641d6aB57A545F08cf473eCD9B6D5F7',
      name: 'GYEN',
      symbol: 'GYEN',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/14191/thumb/icon_gyen_200_200.png?1614843343',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC08512927D12348F6620a698105e1BAac6EcD911',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xFdb794692724153d1488CcdBE0C56c252596735F',
      name: 'Lido DAO',
      symbol: 'LDO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13573/thumb/Lido_DAO.png?1609873644',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
          },
        },
      },
    },
    {
      name: 'ChainLink Token',
      address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
      symbol: 'LINK',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          },
        },
      },
    },
    {
      name: 'LoopringCoin V2',
      address: '0xFEaA9194F9F8c1B65429E31341a103071464907E',
      symbol: 'LRC',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD',
          },
        },
      },
    },
    {
      chainId: 10,
      name: 'Liquity USD',
      symbol: 'LUSD',
      logoURI:
        'https://assets.coingecko.com/coins/images/14666/thumb/Group_3.png?1617631327',
      address: '0xc40F949F8a4e094D1b49a23ea9241D289B7b2819',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
          },
        },
      },
    },
    {
      chainId: 1,
      address: '0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB',
      name: 'CoW Protocol',
      symbol: 'COW',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24384/standard/CoW-token_logo.png?1719524382',
    },
    {
      chainId: 100,
      address: '0x177127622c4a00f3d409b75571e12cb3c8973d3c',
      name: 'CoW Protocol',
      symbol: 'COW',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24384/standard/CoW-token_logo.png?1719524382',
    },
    {
      chainId: 42161,
      address: '0xcb8b5cd20bdcaea9a010ac1f8d835824f5c87a04',
      name: 'CoW Protocol',
      symbol: 'COW',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24384/standard/CoW-token_logo.png?1719524382',
    },
    {
      chainId: 8453,
      address: '0xc694a91e6b071bf030a18bd3053a7fe09b6dae69',
      name: 'CoW Protocol',
      symbol: 'COW',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24384/standard/CoW-token_logo.png?1719524382',
    },
    {
      chainId: 137,
      address: '0x2f4efd3aa42e15a1ec6114547151b63ee5d39958',
      name: 'CoW Protocol',
      symbol: 'COW',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24384/standard/CoW-token_logo.png?1719524382',
    },
    {
      chainId: 10,
      address: '0x3390108E913824B8eaD638444cc52B9aBdF63798',
      name: 'Mask Network',
      symbol: 'MASK',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14051/thumb/Mask_Network.jpg?1614050316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x69af81e73A73B40adF4f3d4223Cd9b1ECE623074',
          },
        },
      },
    },
    {
      name: 'Maker',
      address: '0xab7bAdEF82E9Fe11f6f33f87BC9bC2AA27F2fCB5',
      symbol: 'MKR',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x2561aa2bB1d2Eb6629EDd7b0938d7679B8b49f9E',
      name: 'Ocean Protocol',
      symbol: 'OCEAN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3687/thumb/ocean-protocol-logo.jpg?1547038686',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x4200000000000000000000000000000000000042',
      name: 'Optimism',
      symbol: 'OP',
      decimals: 18,
      logoURI: 'https://ethereum-optimism.github.io/data/OP/logo.png',
    },
    {
      chainId: 10,
      address: '0xC1c167CC44f7923cd0062c4370Df962f9DDB16f5',
      name: 'Pepe',
      symbol: 'PEPE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1682922725',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
      name: 'Perpetual Protocol',
      symbol: 'PERP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12381/thumb/60d18e06844a844ad75901a9_mark_only_03.png?1628674771',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xbC396689893D065F41bc2C6EcbeE5e0085233447',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x7FB688CCf682d58f86D7e38e03f9D22e7705448B',
      name: 'Rai Reflex Index',
      symbol: 'RAI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14004/thumb/RAI-logo-coin.png?1613592334',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xB548f63D4405466B36C0c0aC3318a22fDcec711a',
      name: 'Rari Governance Token',
      symbol: 'RGT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12900/thumb/Rari_Logo_Transparent.png?1613978014',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD291E7a03283640FDc51b121aC401383A46cC623',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x650AF3C15AF43dcB218406d30784416D64Cfb6B2',
      name: 'Status',
      symbol: 'SNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/779/thumb/status.png?1548610778',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x744d70FDBE2Ba4CF95131626614a1763DF805B9E',
          },
        },
      },
    },
    {
      name: 'Synthetix Network Token',
      address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
      symbol: 'SNX',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xba1Cf949c382A32a09A17B2AdF3587fc7fA664f1',
      name: 'SOL Wormhole ',
      symbol: 'SOL',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/22876/thumb/SOL_wh_small.png?1644224316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xEf6301DA234fC7b0545c6E877D3359FE0B9E50a4',
      name: 'SUKU',
      symbol: 'SUKU',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11969/thumb/UmfW5S6f_400x400.jpg?1596602238',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0763fdCCF1aE541A5961815C0872A8c5Bc6DE4d7',
          },
        },
      },
    },
    {
      name: 'Synth sUSD',
      address: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      symbol: 'sUSD',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://assets.coingecko.com/coins/images/5013/thumb/sUSD.png?1616150765',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x3eaEb77b03dBc0F6321AE1b72b2E9aDb0F60112B',
      name: 'Sushi',
      symbol: 'SUSHI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12271/thumb/512x512_Logo_no_chop.png?1606986688',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
          },
        },
      },
    },
    {
      chainId: 10,
      name: 'Threshold Network',
      symbol: 'T',
      logoURI:
        'https://assets.coingecko.com/coins/images/22228/thumb/nFPNiSbL_400x400.jpg?1641220340',
      address: '0x747e42Eb0591547a0ab429B3627816208c734EA7',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0xaf8cA653Fa2772d58f4368B0a71980e9E3cEB888',
      name: 'Tellor',
      symbol: 'TRB',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9644/thumb/Blk_icon_current.png?1584980686',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0',
          },
        },
      },
    },
    {
      name: 'UMA Voting Token v1',
      address: '0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea',
      symbol: 'UMA',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
          },
        },
      },
    },
    {
      name: 'Uniswap',
      address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
      symbol: 'UNI',
      decimals: 18,
      chainId: 10,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          },
        },
      },
    },
    {
      name: 'USDCoin',
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      symbol: 'USDC',
      decimals: 6,
      chainId: 10,
      logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      name: 'USDCoin (Bridged from Ethereum)',
      symbol: 'USDC.e',
      decimals: 6,
      logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
    },

    {
      chainId: 43114,
      address: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
      name: 'Bridged USDC',
      symbol: 'USDC.e',
      decimals: 6,
      logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
    },

    {
      name: 'Tether USD',
      address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      symbol: 'USDT',
      decimals: 6,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          },
        },
      },
    },
    {
      name: 'Wrapped BTC',
      address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      symbol: 'WBTC',
      decimals: 8,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      chainId: 10,
      name: 'WOO Network',
      symbol: 'WOO',
      logoURI:
        'https://assets.coingecko.com/coins/images/12921/thumb/w2UiemF__400x400.jpg?1603670367',
      address: '0x871f2F2ff935FD1eD867842FF2a7bfD051A5E527',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
          },
        },
      },
    },
    {
      chainId: 10,
      address: '0x9046D36440290FfDE54FE0DD84Db8b1CfEE9107B',
      name: 'yearn finance',
      symbol: 'YFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png?1598325330',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
          },
        },
      },
    },
    {
      name: '0x Protocol Token',
      address: '0xD1917629B3E6A72E6772Aab5dBe58Eb7FA3C2F33',
      symbol: 'ZRX',
      decimals: 18,
      chainId: 10,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xE41d2489571d322189246DaFA5ebDe1F4699F498/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa',
      symbol: 'DAI',
      decimals: 18,
      chainId: 42,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa/logo.png',
    },
    {
      name: 'Maker',
      address: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD',
      symbol: 'MKR',
      decimals: 18,
      chainId: 42,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD/logo.png',
    },
    {
      name: 'Uniswap',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      decimals: 18,
      chainId: 42,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
    },
    {
      name: 'Wrapped Ether',
      address: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
      symbol: 'WETH',
      decimals: 18,
      chainId: 42,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xd0A1E359811322d97991E03f863a0C30C2cF029C/logo.png',
    },
    {
      chainId: 56,
      address: '0x111111111117dC0aa78b770fA6A738034120C302',
      name: '1inch',
      symbol: '1INCH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xfb6115445Bff7b52FeB98650C87f44907E58f802',
      name: 'Aave',
      symbol: 'AAVE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xBc7d6B50616989655AfD682fb42743507003056D',
      name: 'Alchemy Pay',
      symbol: 'ACH',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/12390/thumb/ACH_%281%29.png?1599691266',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xEd04915c23f00A313a544955524EB7DBD823143d',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x6bfF4Fb161347ad7de4A625AE5aa3A1CA7077819',
      name: 'Ambire AdEx',
      symbol: 'ADX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/847/thumb/Ambire_AdEx_Symbol_color.png?1655432540',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xADE00C28244d5CE17D72E40330B1c318cD12B7c3',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x12f31B73D812C6Bb0d735a218c086d44D5fe5f89',
      name: 'agEur',
      symbol: 'agEUR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19479/standard/agEUR.png?1696518915',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x33d08D8C7a168333a85285a68C0042b39fC3741D',
      name: 'AIOZ Network',
      symbol: 'AIOZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14631/thumb/aioz_logo.png?1617413126',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x626E8036dEB333b408Be468F951bdB42433cBF18',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x82D2f8E02Afb160Dd5A480a617692e62de9038C4',
      name: 'Aleph im',
      symbol: 'ALEPH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11676/thumb/Monochram-aleph.png?1608483725',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x27702a26126e0B3702af63Ee09aC4d1A084EF628',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xAC51066d7bEC65Dc4589368da368b212745d63E8',
      name: 'My Neighbor Alice',
      symbol: 'ALICE',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/14375/thumb/alice_logo.jpg?1615782968',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xAC51066d7bEC65Dc4589368da368b212745d63E8',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xa1faa113cbE53436Df28FF0aEe54275c13B40975',
      name: 'Alpha Venture DAO',
      symbol: 'ALPHA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12738/thumb/AlphaToken_256x256.png?1617160876',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa1faa113cbE53436Df28FF0aEe54275c13B40975',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xf307910A4c7bbc79691fD374889b36d8531B08e3',
      name: 'Ankr',
      symbol: 'ANKR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4324/thumb/U85xTl2.png?1608111978',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x6F769E65c14Ebd1f68817F5f1DcDb61Cfa2D6f7e',
      name: 'ARPA Chain',
      symbol: 'ARPA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8506/thumb/9u0a23XY_400x400.jpg?1559027357',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBA50933C268F567BDC86E1aC131BE072C6B0b71a',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xA2120b9e674d3fC3875f415A7DF52e382F141225',
      name: 'Automata',
      symbol: 'ATA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15985/thumb/ATA.jpg?1622535745',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA2120b9e674d3fC3875f415A7DF52e382F141225',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x8b1f4432F943c465A973FeDC6d7aa50Fc96f1f65',
      name: 'Axelar',
      symbol: 'AXL',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/27277/large/V-65_xQ1_400x400.jpeg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x467719aD09025FcC6cF6F8311755809d45a5E5f3',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x715D400F88C167884bbCc41C5FeA407ed4D2f8A0',
      name: 'Axie Infinity',
      symbol: 'AXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13029/thumb/axie_infinity_logo.png?1604471082',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x935a544Bf5816E3A7C13DB2EFe3009Ffda0aCdA2',
      name: 'Bluzelle',
      symbol: 'BLZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2848/thumb/ColorIcon_3x.png?1622516510',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5732046A883704404F284Ce41FfADd5b007FD668',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      name: 'Binance USD',
      symbol: 'BUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9576/thumb/BUSD.png?1568947766',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xaEC945e04baF28b135Fa7c640f624f8D90F1C3a6',
      name: 'Coin98',
      symbol: 'C98',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17117/thumb/logo.png?1626412904',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xAE12C5930881c53715B369ceC7606B70d8EB229f',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xf9CeC8d50f6c8ad3Fb6dcCEC577e05aA32B224FE',
      name: 'Chromia',
      symbol: 'CHR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/5000/thumb/Chromia.png?1559038018',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8A2279d4A90B6fe1C4B30fa660cC9f926797bAA2',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x09E889BB4D5b474f561db0491C38702F367A4e4d',
      name: 'Clover Finance',
      symbol: 'CLV',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15278/thumb/clover.png?1645084454',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x80C62FE4487E1351b47Ba49809EBD60ED085bf52',
          },
        },
      },
    },
    {
      name: 'Compound',
      address: '0x52CE071Bd9b1C4B00A0b92D298c512478CaD67e8',
      symbol: 'COMP',
      decimals: 18,
      chainId: 56,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xd15CeE1DEaFBad6C0B3Fd7489677Cc102B141464',
      name: 'Circuits of Value',
      symbol: 'COVAL',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/588/thumb/coval-logo.png?1599493950',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3D658390460295FB963f54dC0899cfb1c30776Df',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x8dA443F84fEA710266C8eB6bC34B71702d033EF2',
      name: 'Cartesi',
      symbol: 'CTSI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11038/thumb/cartesi.png?1592288021',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
      symbol: 'DAI',
      decimals: 18,
      chainId: 56,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x23CE9e926048273eF83be0A3A8Ba9Cb6D45cd978',
      name: 'Mines of Dalarnia',
      symbol: 'DAR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/19837/thumb/dar.png?1636014223',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x081131434f93063751813C619Ecca9C4dC7862a3',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xe91a8D2c584Ca93C7405F15c22CdFE53C29896E3',
      name: 'DexTools',
      symbol: 'DEXT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11603/thumb/dext.png?1605790188',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xfB7B4564402E5500dB5bB6d63Ae671302777C75a',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x99956D38059cf7bEDA96Ec91Aa7BB2477E0901DD',
      name: 'DIA',
      symbol: 'DIA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11955/thumb/image.png?1646041751',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xEC583f25A049CC145dA9A256CDbE9B6201a705Ff',
      name: 'Drep',
      symbol: 'DREP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14578/thumb/KotgsCgS_400x400.jpg?1617094445',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3Ab6Ed69Ef663bd986Ee59205CCaD8A20F98b4c2',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17',
      name: 'DeFi Yield Protocol',
      symbol: 'DYP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13480/thumb/DYP_Logo_Symbol-8.png?1655809066',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x7bd6FaBD64813c48545C9c0e312A0099d9be2540',
      name: 'Dogelon Mars',
      symbol: 'ELON',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14962/thumb/6GxcPRo3_400x400.jpg?1619157413',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x4B5C23cac08a567ecf0c1fFcA8372A45a5D33743',
      name: 'Harvest Finance',
      symbol: 'FARM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12304/thumb/Harvest.png?1613016180',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa0246c9032bC3A600820415aE600c6388619A14D',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x031b41e504677879370e9DBcF937283A8691Fa7f',
      name: 'Fetch ai',
      symbol: 'FET',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/5681/thumb/Fetch.jpg?1572098136',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40',
      name: 'Frax',
      symbol: 'FRAX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13422/thumb/frax_logo.png?1608476506',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xAD29AbB318791D579433D831ed122aFeAf29dcfe',
      name: 'Fantom',
      symbol: 'FTM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4001/thumb/Fantom.png?1558015016',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4E15361FD6b4BB609Fa63C81A2be19d873717870',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE',
      name: 'Frax Share',
      symbol: 'FXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13423/thumb/frax_share.png?1608478989',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xe4Cc45Bb5DBDA06dB6183E8bf016569f40497Aa5',
      name: 'Project Galaxy',
      symbol: 'GAL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24530/thumb/GAL-Token-Icon.png?1651483533',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5fAa989Af96Af85384b8a938c2EdE4A7378D9875',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x44Ec807ce2F4a6F2737A92e985f318d035883e47',
      name: 'Hashflow',
      symbol: 'HFT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/26136/large/hashflow-icon-cmc.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xb3999F658C0391d94A37f7FF328F3feC942BcADC',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x5f4Bde007Dc06b867f86EBFE4802e34A1fFEEd63',
      name: 'Highstreet',
      symbol: 'HIGH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18973/thumb/logosq200200Coingecko.png?1634090470',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x71Ab77b7dbB4fa7e017BC15090b2163221420282',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xa2B726B1145A4773F68593CF171187d8EBe4d495',
      name: 'Injective',
      symbol: 'INJ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12882/thumb/Secondary_Symbol.png?1628233237',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'Jupiter',
      symbol: 'JUP',
      logoURI:
        'https://assets.coingecko.com/coins/images/10351/thumb/logo512.png?1632480932',
      address: '0x0231f91e02DebD20345Ae8AB7D71A41f8E140cE7',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4B1E80cAC91e2216EEb63e29B957eB91Ae9C2Be8',
          },
        },
      },
    },
    {
      name: 'ChainLink Token',
      address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
      symbol: 'LINK',
      decimals: 18,
      chainId: 56,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x2eD9a5C8C13b93955103B9a7C167B67Ef4d568a3',
      name: 'Mask Network',
      symbol: 'MASK',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14051/thumb/Mask_Network.jpg?1614050316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x69af81e73A73B40adF4f3d4223Cd9b1ECE623074',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'MATH',
      symbol: 'MATH',
      logoURI:
        'https://assets.coingecko.com/coins/images/11335/thumb/2020-05-19-token-200.png?1589940590',
      address: '0xF218184Af829Cf2b0019F8E6F0b2423498a36983',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x08d967bb0134F2d07f7cfb6E246680c53927DD30',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD',
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?1624446912',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x949D48EcA67b17269629c7194F4b727d4Ef9E5d6',
      name: 'Merit Circle',
      symbol: 'MC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19304/thumb/Db4XqML.png?1634972154',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x949D48EcA67b17269629c7194F4b727d4Ef9E5d6',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'Metis',
      symbol: 'METIS',
      logoURI:
        'https://assets.coingecko.com/coins/images/15595/thumb/metis.jpeg?1660285312',
      address: '0xe552Fb52a4F19e44ef5A967632DBc320B0820639',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9E32b13ce7f2E80A01932B42553652E053D6ed8e',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba',
      name: 'Magic Internet Money',
      symbol: 'MIM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/16786/thumb/mimlogopng.png?1624979612',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x5B6DcF557E2aBE2323c48445E8CC948910d8c2c9',
      name: 'Mirror Protocol',
      symbol: 'MIR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13295/thumb/mirror_logo_transparent.png?1611554658',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x09a3EcAFa817268f77BE1283176B946C4ff2E608',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x9Fb9a33956351cf4fa040f65A13b835A3C8764E3',
      name: 'Multichain',
      symbol: 'MULTI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22087/thumb/1_Wyot-SDGZuxbjdkaOeT2-A.png?1640764238',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x65Ef703f5594D2573eb71Aaf55BC0CB548492df4',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'Nest Protocol',
      symbol: 'NEST',
      logoURI:
        'https://assets.coingecko.com/coins/images/11284/thumb/52954052.png?1589868539',
      address: '0x98f8669F6481EbB341B522fCD3663f79A3d1A6A7',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x04abEdA201850aC0124161F037Efd70c74ddC74C',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x4e7f408be2d4E9D60F49A64B89Bb619c84C7c6F5',
      name: 'Perpetual Protocol',
      symbol: 'PERP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12381/thumb/60d18e06844a844ad75901a9_mark_only_03.png?1628674771',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xbC396689893D065F41bc2C6EcbeE5e0085233447',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x7e624FA0E1c4AbFD309cC15719b7E2580887f570',
      name: 'Polkastarter',
      symbol: 'POLS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12648/thumb/polkastarter.png?1609813702',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x83e6f1E41cdd28eAcEB20Cb649155049Fac3D5Aa',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'PARSIQ',
      symbol: 'PRQ',
      logoURI:
        'https://assets.coingecko.com/coins/images/11973/thumb/DsNgK0O.png?1596590280',
      address: '0xd21d29B38374528675C34936bf7d5Dd693D2a577',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x362bc847A3a9637d3af6624EeC853618a43ed7D2',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'pSTAKE Finance',
      symbol: 'PSTAKE',
      logoURI:
        'https://assets.coingecko.com/coins/images/23931/thumb/PSTAKE_Dark.png?1645709930',
      address: '0x4C882ec256823eE773B25b414d36F92ef58a7c0C',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xfB5c6815cA3AC72Ce9F5006869AE67f18bF77006',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'REVV',
      symbol: 'REVV',
      logoURI:
        'https://assets.coingecko.com/coins/images/12373/thumb/REVV_TOKEN_Refined_2021_%281%29.png?1627652390',
      address: '0x833F307aC507D47309fD8CDD1F835BeF8D702a93',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x557B933a7C2c45672B610F8954A3deB39a51A8Ca',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xfA54fF1a158B5189Ebba6ae130CEd6bbd3aEA76e',
      name: 'SOL Wormhole ',
      symbol: 'SOL',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/22876/thumb/SOL_wh_small.png?1644224316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'Stargate Finance',
      symbol: 'STG',
      logoURI:
        'https://assets.coingecko.com/coins/images/24413/thumb/STG_LOGO.png?1647654518',
      address: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x51BA0b044d96C3aBfcA52B64D733603CCC4F0d4D',
      name: 'SuperFarm',
      symbol: 'SUPER',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14040/thumb/6YPdWn6.png?1613975899',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xe53EC727dbDEB9E2d5456c3be40cFF031AB40A55',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x947950BcC74888a40Ffa2593C5798F11Fc9124C4',
      name: 'Sushi',
      symbol: 'SUSHI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12271/thumb/512x512_Logo_no_chop.png?1606986688',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'SWFTCOIN',
      symbol: 'SWFTC',
      logoURI:
        'https://assets.coingecko.com/coins/images/2346/thumb/SWFTCoin.jpg?1618392022',
      address: '0xE64E30276C2F826FEbd3784958d6Da7B55DfbaD3',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0bb217E40F8a5Cb79Adf04E1aAb60E5abd0dfC1e',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'Swipe',
      symbol: 'SXP',
      logoURI:
        'https://assets.coingecko.com/coins/images/9368/thumb/swipe.png?1566792311',
      address: '0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8CE9137d39326AD0cD6491fb5CC0CbA0e089b6A9',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xa4080f1778e69467E905B8d6F72f6e441f9e9484',
      name: 'Synapse',
      symbol: 'SYN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18024/thumb/syn.png?1635002049',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0f2D719407FdBeFF09D87557AbB7232601FD9F29',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'ChronoTech',
      symbol: 'TIME',
      logoURI:
        'https://assets.coingecko.com/coins/images/604/thumb/time-32x32.png?1627130666',
      address: '0x3b198e26E473b8faB2085b37978e36c9DE5D7f68',
      decimals: 8,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x485d17A6f1B8780392d53D64751824253011A260',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'Alien Worlds',
      symbol: 'TLM',
      logoURI:
        'https://assets.coingecko.com/coins/images/14676/thumb/kY-C4o7RThfWrDQsLCAG4q4clZhBDDfJQVhWUEKxXAzyQYMj4Jmq1zmFwpRqxhAJFPOa0AsW_PTSshoPuMnXNwq3rU7Imp15QimXTjlXMx0nC088mt1rIwRs75GnLLugWjSllxgzvQ9YrP4tBgclK4_rb17hjnusGj_c0u2fx0AvVokjSNB-v2poTj0xT9BZRCbzRE3-lF1.jpg?1617700061',
      address: '0x2222227E22102Fe3322098e4CBfE18cFebD57c95',
      decimals: 4,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x888888848B652B3E3a0f34c96E00EEC0F3a23F72',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x728C5baC3C3e370E372Fc4671f9ef6916b814d8B',
      name: 'Unifi Protocol DAO',
      symbol: 'UNFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13152/thumb/logo-2.png?1605748967',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x441761326490cACF7aF299725B6292597EE822c2',
          },
        },
      },
    },
    {
      name: 'Uniswap',
      address: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
      symbol: 'UNI',
      decimals: 18,
      chainId: 56,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0x0D35A2B85c5A63188d566D104bEbf7C694334Ee4',
      name: 'Pawtocol',
      symbol: 'UPI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12186/thumb/pawtocol.jpg?1597962008',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x70D2b7C19352bB76e4409858FF5746e500f2B67c',
          },
        },
      },
    },
    {
      name: 'USDCoin',
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      decimals: 18,
      chainId: 56,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
      },
    },
    {
      name: 'Tether USD',
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      decimals: 18,
      chainId: 56,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          },
        },
      },
    },
    {
      chainId: 56,
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      name: 'Wrapped BNB',
      symbol: 'WBNB',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png',
    },
    {
      name: 'Wrapped Ether',
      address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      symbol: 'WETH',
      decimals: 18,
      chainId: 56,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'WOO Network',
      symbol: 'WOO',
      logoURI:
        'https://assets.coingecko.com/coins/images/12921/thumb/w2UiemF__400x400.jpg?1603670367',
      address: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
          },
        },
      },
    },
    {
      chainId: 56,
      name: 'Chain',
      symbol: 'XCN',
      logoURI:
        'https://assets.coingecko.com/coins/images/24210/thumb/Chain_icon_200x200.png?1646895054',
      address: '0x7324c7C0d95CEBC73eEa7E85CbAac0dBdf88a05b',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x9c2C5fd7b07E95EE044DDeba0E97a665F142394f',
      name: '1inch',
      symbol: '1INCH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
      name: 'Aave',
      symbol: 'AAVE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xdDa7b23D2D72746663E7939743f929a3d85FC975',
      name: 'Ambire AdEx',
      symbol: 'ADX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/847/thumb/Ambire_AdEx_Symbol_color.png?1655432540',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xADE00C28244d5CE17D72E40330B1c318cD12B7c3',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4',
      name: 'agEur',
      symbol: 'agEUR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19479/standard/agEUR.png?1696518915',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x6a6bD53d677F8632631662C48bD47b1D4D6524ee',
      name: 'Adventure Gold',
      symbol: 'AGLD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18125/thumb/lpgblc4h_400x400.jpg?1630570955',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x32353A6C91143bfd6C7d363B546e62a9A2489A20',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xe2341718c6C0CbFa8e6686102DD8FbF4047a9e9B',
      name: 'AIOZ Network',
      symbol: 'AIOZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14631/thumb/aioz_logo.png?1617413126',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x626E8036dEB333b408Be468F951bdB42433cBF18',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x95c300e7740D2A88a44124B424bFC1cB2F9c3b89',
      name: 'Alchemix',
      symbol: 'ALCX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14113/thumb/Alchemix.png?1614409874',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x82dCf1Df86AdA26b2dCd9ba6334CeDb8c2448e9e',
      name: 'Aleph im',
      symbol: 'ALEPH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11676/thumb/Monochram-aleph.png?1608483725',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x27702a26126e0B3702af63Ee09aC4d1A084EF628',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xbFc70507384047Aa74c29Cdc8c5Cb88D0f7213AC',
      name: 'Alethea Artificial Liquid Intelligence',
      symbol: 'ALI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22062/thumb/alethea-logo-transparent-colored.png?1642748848',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B0b3a982b4634aC68dD83a4DBF02311cE324181',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x50858d870FAF55da2fD90FB6DF7c34b5648305C6',
      name: 'My Neighbor Alice',
      symbol: 'ALICE',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/14375/thumb/alice_logo.jpg?1615782968',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xAC51066d7bEC65Dc4589368da368b212745d63E8',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x3AE490db48d74B1bC626400135d4616377D0109f',
      name: 'Alpha Venture DAO',
      symbol: 'ALPHA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12738/thumb/AlphaToken_256x256.png?1617160876',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa1faa113cbE53436Df28FF0aEe54275c13B40975',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0621d647cecbFb64b79E44302c1933cB4f27054d',
      name: 'Amp',
      symbol: 'AMP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12409/thumb/amp-200x200.png?1599625397',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xfF20817765cB7f73d4bde2e66e067E58D11095C2',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x101A023270368c0D50BFfb62780F4aFd4ea79C35',
      name: 'Ankr',
      symbol: 'ANKR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4324/thumb/U85xTl2.png?1608111978',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
          },
        },
      },
    },
    {
      name: 'Aragon',
      address: '0x2b8504ab5eFc246d0eC5Ec7E74565683227497de',
      symbol: 'ANT',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://assets.coingecko.com/coins/images/681/thumb/JelZ58cv_400x400.png?1601449653',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa117000000f279D81A1D3cc75430fAA017FA5A2e',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xB7b31a6BC18e48888545CE79e83E06003bE70930',
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg?1647476455',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x45C27821E80F8789b60Fd8B600C73815d34DDa6C',
      name: 'API3',
      symbol: 'API3',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13256/thumb/api3.jpg?1606751424',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xEE800B277A96B0f490a1A732e1D6395FAD960A26',
      name: 'ARPA Chain',
      symbol: 'ARPA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8506/thumb/9u0a23XY_400x400.jpg?1559027357',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBA50933C268F567BDC86E1aC131BE072C6B0b71a',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x04bEa9FCE76943E90520489cCAb84E84C0198E29',
      name: 'AirSwap',
      symbol: 'AST',
      decimals: 4,
      logoURI:
        'https://assets.coingecko.com/coins/images/1019/thumb/Airswap.png?1630903484',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x27054b13b1B798B345b591a4d22e6562d47eA75a',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0df0f72EE0e5c9B7ca761ECec42754992B2Da5BF',
      name: 'Automata',
      symbol: 'ATA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15985/thumb/ATA.jpg?1622535745',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA2120b9e674d3fC3875f415A7DF52e382F141225',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x5eB8D998371971D01954205c7AFE90A7AF6a95AC',
      name: 'Audius',
      symbol: 'AUDIO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12913/thumb/AudiusCoinLogo_2x.png?1603425727',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x61BDD9C7d4dF4Bf47A4508c0c8245505F2Af5b7b',
      name: 'Axie Infinity',
      symbol: 'AXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13029/thumb/axie_infinity_logo.png?1604471082',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x1FcbE5937B0cc2adf69772D228fA4205aCF4D9b2',
      name: 'Badger DAO',
      symbol: 'BADGER',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13287/thumb/badger_dao_logo.jpg?1607054976',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3472A5A71965499acd81997a54BBA8D852C6E53d',
          },
        },
      },
    },
    {
      name: 'Balancer',
      address: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3',
      symbol: 'BAL',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xba100000625a3754423978a60c9317c58a424e3D/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3D',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xA8b1E0764f85f53dfe21760e8AfE5446D82606ac',
      name: 'Band Protocol',
      symbol: 'BAND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9545/thumb/band-protocol.png?1568730326',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBA11D00c5f74255f56a5E366F4F77f5A186d7f55',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x3Cef98bb43d732E2F285eE605a8158cDE967D219',
      name: 'Basic Attention Token',
      symbol: 'BAT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x91c89A94567980f0e9723b487b0beD586eE96aa7',
      name: 'Biconomy',
      symbol: 'BICO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/21061/thumb/biconomy_logo.jpg?1638269749',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF17e65822b568B3903685a7c9F496CF7656Cc6C2',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x438B28C5AA5F00a817b7Def7cE2Fb3d5d1970974',
      name: 'Bluzelle',
      symbol: 'BLZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2848/thumb/ColorIcon_3x.png?1622516510',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5732046A883704404F284Ce41FfADd5b007FD668',
          },
        },
      },
    },
    {
      name: 'Bancor Network Token',
      address: '0xc26D47d5c33aC71AC5CF9F776D63Ba292a4F7842',
      symbol: 'BNT',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xa4B2B20b2C73c7046ED19AC6bfF5E5285c58F20a',
      name: 'Boba Network',
      symbol: 'BOBA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/20285/thumb/BOBA.png?1636811576',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x42bBFa2e77757C645eeaAd1655E0911a7553Efbc',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xA041544fe2BE56CCe31Ebb69102B965E06aacE80',
      name: 'BarnBridge',
      symbol: 'BOND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12811/thumb/barnbridge.jpg?1602728853',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0391D2021f89DC339F60Fff84546EA23E337750f',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xdAb529f40E671A1D4bF91361c21bf9f0C9712ab7',
      name: 'Binance USD',
      symbol: 'BUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9576/thumb/BUSD.png?1568947766',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x91a4635F620766145C099E15889Bd2766906A559',
      name: 'Celer Network',
      symbol: 'CELR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4379/thumb/Celr.png?1554705437',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4F9254C83EB525f9FCf346490bbb3ed28a81C667',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x594C984E3318e91313f881B021A0C4203fF5E59F',
      name: 'Chromia',
      symbol: 'CHR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/5000/thumb/Chromia.png?1559038018',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8A2279d4A90B6fe1C4B30fa660cC9f926797bAA2',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xf1938Ce12400f9a761084E7A80d37e732a4dA056',
      name: 'Chiliz',
      symbol: 'CHZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8834/thumb/Chiliz.png?1561970540',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF',
          },
        },
      },
    },
    {
      name: 'Compound',
      address: '0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c',
      symbol: 'COMP',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x93B0fF1C8828F6eB039D345Ff681eD735086d925',
      name: 'Covalent',
      symbol: 'CQT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14168/thumb/covalent-cqt.png?1624545218',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD417144312DbF50465b1C641d016962017Ef6240',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xAdA58DF0F643D959C2A47c9D4d4c1a4deFe3F11C',
      name: 'Cronos',
      symbol: 'CRO',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/7310/thumb/oCw2s3GI_400x400.jpeg?1645172042',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b',
          },
        },
      },
    },
    {
      name: 'Curve DAO Token',
      address: '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
      symbol: 'CRV',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD533a949740bb3306d119CC777fa900bA034cd52/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x2727Ab1c2D22170ABc9b595177B2D5C6E1Ab7B7B',
      name: 'Cartesi',
      symbol: 'CTSI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11038/thumb/cartesi.png?1592288021',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x8c208BC2A808a088a78398fed8f2640cab0b6EDb',
      name: 'Cryptex Finance',
      symbol: 'CTX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14932/thumb/glossy_icon_-_C200px.png?1619073171',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x321C2fE4446C7c963dc41Dd58879AF648838f98D',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x276C9cbaa4BDf57d7109a41e67BD09699536FA3d',
      name: 'Somnium Space CUBEs',
      symbol: 'CUBE',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/10687/thumb/CUBE_icon.png?1617026861',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xDf801468a808a32656D2eD2D2d80B72A129739f4',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x66Dc5A08091d1968e08C16aA5b27BAC8398b02Be',
      name: 'Civic',
      symbol: 'CVC',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/788/thumb/civic.png?1547034556',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x41e5560054824eA6B0732E656E3Ad64E20e94E45',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x4257EA7637c355F81616050CbB6a9b709fd72683',
      name: 'Convex Finance',
      symbol: 'CVX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15585/thumb/convex.png?1621256328',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      symbol: 'DAI',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x26f5FB1e6C8a65b3A873fF0a213FA16EFF5a7828',
      name: 'DerivaDAO',
      symbol: 'DDX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13453/thumb/ddx_logo.png?1608741641',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3A880652F47bFaa771908C07Dd8673A787dAEd3A',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xff835562C761205659939B64583dd381a6AA4D92',
      name: 'DexTools',
      symbol: 'DEXT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11603/thumb/dext.png?1605790188',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xfB7B4564402E5500dB5bB6d63Ae671302777C75a',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x993f2CafE9dbE525243f4A78BeBC69DAc8D36000',
      name: 'DIA',
      symbol: 'DIA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11955/thumb/image.png?1646041751',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369',
      name: 'DeFi Pulse Index',
      symbol: 'DPI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12465/thumb/defi_pulse_index_set.png?1600051053',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x4C3bF0a3DE9524aF68327d1D2558a3B70d17D42a',
      name: 'dYdX',
      symbol: 'DYDX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17500/thumb/hjnIm9bV.jpg?1628009360',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x92D6C1e31e14520e676a687F0a93788B716BEff5',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xE0339c80fFDE91F3e20494Df88d4206D86024cdF',
      name: 'Dogelon Mars',
      symbol: 'ELON',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14962/thumb/6GxcPRo3_400x400.jpg?1619157413',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x7eC26842F195c852Fa843bB9f6D8B583a274a157',
      name: 'Enjin Coin',
      symbol: 'ENJ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1102/thumb/enjin-coin-logo.png?1547035078',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xbD7A5Cf51d22930B8B3Df6d834F9BCEf90EE7c4f',
      name: 'Ethereum Name Service',
      symbol: 'ENS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19785/thumb/acatxTm8_400x400.jpg?1635850140',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0E50BEA95Fe001A370A4F1C220C49AEdCB982DeC',
      name: 'Ethernity Chain',
      symbol: 'ERN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14238/thumb/LOGO_HIGH_QUALITY.png?1647831402',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBBc2AE13b23d715c30720F079fcd9B4a74093505',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x8a037dbcA8134FFc72C362e394e35E0Cad618F85',
      name: 'Euro Coin',
      symbol: 'EURC',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/26045/standard/euro.png?1696525125',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x176f5AB638cf4Ff3B6239Ba609C3fadAA46ef5B0',
      name: 'Harvest Finance',
      symbol: 'FARM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12304/thumb/Harvest.png?1613016180',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa0246c9032bC3A600820415aE600c6388619A14D',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x7583FEDDbceFA813dc18259940F76a02710A8905',
      name: 'Fetch ai',
      symbol: 'FET',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/5681/thumb/Fetch.jpg?1572098136',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x7A7B94F18EF6AD056CDa648588181CDA84800f94',
      name: 'Stafi',
      symbol: 'FIS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12423/thumb/stafi_logo.jpg?1599730991',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xef3A930e1FfFFAcd2fc13434aC81bD278B0ecC8d',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x9ff62d1FC52A907B6DCbA8077c2DDCA6E6a9d3e1',
      name: 'Forta',
      symbol: 'FORT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/25060/thumb/Forta_lgo_%281%29.png?1655353696',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x41545f8b9472D758bB669ed8EaEEEcD7a9C4Ec29',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x5eCbA59DAcc1ADc5bDEA35f38A732823fc3dE977',
      name: 'Ampleforth Governance Token',
      symbol: 'FORTH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14917/thumb/photo_2021-04-22_00.00.03.jpeg?1619020835',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x77FbA179C79De5B7653F68b5039Af940AdA60ce0',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x65A05DB8322701724c197AF82C9CaE41195B0aA8',
      name: 'ShapeShift FOX Token',
      symbol: 'FOX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9988/thumb/FOX.png?1574330622',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x104592a158490a9228070E0A8e5343B499e125D0',
      name: 'Frax',
      symbol: 'FRAX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13422/thumb/frax_logo.png?1608476506',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xC9c1c1c20B3658F8787CC2FD702267791f224Ce1',
      name: 'Fantom',
      symbol: 'FTM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4001/thumb/Fantom.png?1558015016',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4E15361FD6b4BB609Fa63C81A2be19d873717870',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x3e121107F6F22DA4911079845a470757aF4e1A1b',
      name: 'Frax Share',
      symbol: 'FXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13423/thumb/frax_share.png?1608478989',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7',
      name: 'Aavegotchi',
      symbol: 'GHST',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12467/thumb/ghst_200.png?1600750321',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3F382DbD960E3a9bbCeaE22651E88158d2791550',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0B220b82F3eA3B7F6d9A1D8ab58930C064A2b5Bf',
      name: 'Golem',
      symbol: 'GLM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/542/thumb/Golem_Submark_Positive_RGB.png?1606392013',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7DD9c5Cba05E151C895FDe1CF355C9A1D5DA6429',
          },
        },
      },
    },
    {
      name: 'Gnosis Token',
      address: '0x5FFD62D3C3eE2E81C00A7b9079FB248e7dF024A8',
      symbol: 'GNO',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6810e776880C02933D47DB1b9fc05908e5386b96/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6810e776880C02933D47DB1b9fc05908e5386b96',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xF88fc6b493eda7650E4bcf7A290E8d108F677CfE',
      name: 'Gods Unchained',
      symbol: 'GODS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17139/thumb/10631.png?1635718182',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xccC8cb5229B0ac8069C51fd58367Fd1e622aFD97',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x5fe2B58c013d7601147DcdD68C143A77499f5531',
      name: 'The Graph',
      symbol: 'GRT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13397/thumb/Graph_Token.png?1608145566',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xdb95f9188479575F3F718a245EcA1B3BF74567EC',
      name: 'Gitcoin',
      symbol: 'GTC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15810/thumb/gitcoin.png?1621992929',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xC8A94a3d3D2dabC3C1CaffFFDcA6A7543c3e3e65',
      name: 'Gemini Dollar',
      symbol: 'GUSD',
      decimals: 2,
      logoURI:
        'https://assets.coingecko.com/coins/images/5992/thumb/gemini-dollar-gusd.png?1536745278',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x482bc619eE7662759CDc0685B4E78f464Da39C73',
      name: 'GYEN',
      symbol: 'GYEN',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/14191/thumb/icon_gyen_200_200.png?1614843343',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC08512927D12348F6620a698105e1BAac6EcD911',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'HOPR',
      symbol: 'HOPR',
      logoURI:
        'https://assets.coingecko.com/coins/images/14061/thumb/Shared_HOPR_logo_512px.png?1614073468',
      address: '0x6cCBF3627b2C83AFEF05bf2F035E7f7B210Fe30D',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF5581dFeFD8Fb0e4aeC526bE659CFaB1f8c781dA',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x9Cb74C8032b007466865f060ad2c46145d45553D',
      name: 'IDEX',
      symbol: 'IDEX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2565/thumb/logomark-purple-286x286.png?1638362736',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xB705268213D593B8FD88d3FDEFF93AFF5CbDcfAE',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xFA46dAf9909e116DBc40Fe1cC95fC0Bb1f452aBE',
      name: 'Illuvium',
      symbol: 'ILV',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/14468/large/ILV.JPG',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x183070C90B34A63292cC908Ce1b263Cb56D49A7F',
      name: 'Immutable X',
      symbol: 'IMX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17233/thumb/imx.png?1636691817',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Index Cooperative',
      symbol: 'INDEX',
      logoURI:
        'https://assets.coingecko.com/coins/images/12729/thumb/index.png?1634894321',
      address: '0xfBd8A3b908e764dBcD51e27992464B4432A1132b',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0954906da0Bf32d5479e25f46056d22f08464cab',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x4E8dc2149EaC3f3dEf36b1c281EA466338249371',
      name: 'Injective',
      symbol: 'INJ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12882/thumb/Secondary_Symbol.png?1628233237',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xF18Ac368001b0DdC80aA6a8374deb49e868EFDb8',
      name: 'Inverse Finance',
      symbol: 'INV',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14205/thumb/inverse_finance.jpg?1614921871',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x41D5D79431A913C4aE7d69a668ecdfE5fF9DFB68',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xf6372cDb9c1d3674E83842e3800F2A62aC9F3C66',
      name: 'IoTeX',
      symbol: 'IOTX',
      decimals: 18,
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2777.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6fB3e0A217407EFFf7Ca062D46c26E5d60a14d69',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xb87f5c1E81077FfcfE821dA240fd20C99c533aF1',
      name: 'JasmyCoin',
      symbol: 'JASMY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13876/thumb/JASMY200x200.jpg?1612473259',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x42f37A1296b2981F7C3cAcEd84c5096b2Eb0C72C',
      name: 'Keep Network',
      symbol: 'KEEP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3373/thumb/IuNzUb5b_400x400.jpg?1589526336',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC',
          },
        },
      },
    },
    {
      name: 'Kyber Network Crystal',
      address: '0x324b28d6565f784d596422B0F2E5aB6e9CFA1Dc7',
      symbol: 'KNC',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdd974D5C2e2928deA5F71b9825b8b646686BD200/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xdd974D5C2e2928deA5F71b9825b8b646686BD200',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x53AEc293212E3B792563Bc16f1be26956adb12e9',
      name: 'Keep3rV1',
      symbol: 'KP3R',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12966/thumb/kp3r_logo.jpg?1607057458',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xE8A51D0dD1b4525189ddA2187F90ddF0932b5482',
      name: 'LCX',
      symbol: 'LCX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9985/thumb/zRPSu_0o_400x400.jpg?1574327008',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x037A54AaB062628C9Bbae1FDB1583c195585fe41',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xC3C7d422809852031b44ab29EEC9F1EfF2A58756',
      name: 'Lido DAO',
      symbol: 'LDO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13573/thumb/Lido_DAO.png?1609873644',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
          },
        },
      },
    },
    {
      name: 'ChainLink Token',
      address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
      symbol: 'LINK',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'League of Kingdoms',
      symbol: 'LOKA',
      logoURI:
        'https://assets.coingecko.com/coins/images/22572/thumb/loka_64pix.png?1642643271',
      address: '0x465b67CB20A7E8bC4c51b4C7DA591C1945b41427',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x61E90A50137E1F645c9eF4a0d3A4f01477738406',
          },
        },
      },
    },
    {
      name: 'Loom Network',
      address: '0x66EfB7cC647e0efab02eBA4316a2d2941193F6b3',
      symbol: 'LOOM',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA4e8C3Ec456107eA67d3075bF9e3DF3A75823DB0/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA4e8C3Ec456107eA67d3075bF9e3DF3A75823DB0',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x3962F4A0A0051DccE0be73A7e09cEf5756736712',
      name: 'Livepeer',
      symbol: 'LPT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/7137/thumb/logo-circle-green.png?1619593365',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x8Ab2Fec94d17ae69FB90E7c773f2C85Ed1802c01',
      name: 'Liquity',
      symbol: 'LQTY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14665/thumb/200-lqty-icon.png?1617631180',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D',
          },
        },
      },
    },
    {
      name: 'LoopringCoin V2',
      address: '0x84e1670F61347CDaeD56dcc736FB990fBB47ddC1',
      symbol: 'LRC',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Liquity USD',
      symbol: 'LUSD',
      logoURI:
        'https://assets.coingecko.com/coins/images/14666/thumb/Group_3.png?1617631327',
      address: '0x23001f892c0C82b79303EDC9B9033cD190BB21c7',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4',
      name: 'Decentraland',
      symbol: 'MANA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/878/thumb/decentraland-mana.png?1550108745',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x2B9E7ccDF0F4e5B24757c1E1a80e311E34Cb10c7',
      name: 'Mask Network',
      symbol: 'MASK',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14051/thumb/Mask_Network.jpg?1614050316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x69af81e73A73B40adF4f3d4223Cd9b1ECE623074',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'MATH',
      symbol: 'MATH',
      logoURI:
        'https://assets.coingecko.com/coins/images/11335/thumb/2020-05-19-token-200.png?1589940590',
      address: '0x347ACCAFdA7F8c5BdeC57fa34a5b663CBd1aeca7',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x08d967bb0134F2d07f7cfb6E246680c53927DD30',
          },
        },
      },
    },
    // {
    //   chainId: 137,
    //   address: '0x0000000000000000000000000000000000001010',
    //   name: 'Polygon',
    //   symbol: 'MATIC',
    //   decimals: 18,
    //   logoURI:
    //     'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?1624446912',
    //   extensions: {
    //     bridgeInfo: {
    //       '1': {
    //         tokenAddress: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    //       },
    //     },
    //   },
    // },
    {
      chainId: 137,
      address: '0xAa7DbD1598251f856C12f63557A4C4397c253Cea',
      name: 'Moss Carbon Credit',
      symbol: 'MCO2',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14414/thumb/ENtxnThA_400x400.jpg?1615948522',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xfC98e825A2264D890F9a1e68ed50E1526abCcacD',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Metis',
      symbol: 'METIS',
      logoURI:
        'https://assets.coingecko.com/coins/images/15595/thumb/metis.jpeg?1660285312',
      address: '0x1B9D40715E757Bdb9bdEC3215B898E46d8a3b71a',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9E32b13ce7f2E80A01932B42553652E053D6ed8e',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x01288e04435bFcd4718FF203D6eD18146C17Cd4b',
      name: 'Magic Internet Money',
      symbol: 'MIM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/16786/thumb/mimlogopng.png?1624979612',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x1C5cccA2CB59145A4B25F452660cbA6436DDce9b',
      name: 'Mirror Protocol',
      symbol: 'MIR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13295/thumb/mirror_logo_transparent.png?1611554658',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x09a3EcAFa817268f77BE1283176B946C4ff2E608',
          },
        },
      },
    },
    {
      name: 'Maker',
      address: '0x6f7C932e7684666C9fd1d44527765433e01fF61d',
      symbol: 'MKR',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xa9f37D84c856fDa3812ad0519Dad44FA0a3Fe207',
      name: 'Melon',
      symbol: 'MLN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/605/thumb/melon.png?1547034295',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xec67005c4E498Ec7f55E092bd1d35cbC47C91892',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Monavale',
      symbol: 'MONA',
      logoURI:
        'https://assets.coingecko.com/coins/images/13298/thumb/monavale_logo.jpg?1607232721',
      address: '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x275f5Ad03be0Fa221B4C6649B8AeE09a42D9412A',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'GensoKishi Metaverse',
      symbol: 'MV',
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/17704.png',
      address: '0xA3c322Ad15218fBFAEd26bA7f616249f7705D945',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xAE788F80F2756A86aa2F410C651F2aF83639B95b',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x4985E0B13554fB521840e893574D3848C10Fcc6f',
      name: 'PolySwarm',
      symbol: 'NCT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2843/thumb/ImcYCVfX_400x400.jpg?1628519767',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9E46A38F5DaaBe8683E10793b06749EEF7D733d1',
          },
        },
      },
    },
    {
      name: 'Numeraire',
      address: '0x0Bf519071b02F22C17E7Ed5F4002ee1911f46729',
      symbol: 'NMR',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x282d8efCe846A88B159800bd4130ad77443Fa1A1',
      name: 'Ocean Protocol',
      symbol: 'OCEAN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3687/thumb/ocean-protocol-logo.jpg?1547038686',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xa63Beffd33AB3a2EfD92a39A7D2361CEE14cEbA8',
      name: 'Origin Protocol',
      symbol: 'OGN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3296/thumb/op.jpg?1547037878',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x62414D03084EeB269E18C970a21f45D2967F0170',
      name: 'OMG Network',
      symbol: 'OMG',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/776/thumb/OMG_Network.jpg?1591167168',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0EE392bA5ef1354c9bd75a98044667d307C0e773',
      name: 'Orion Protocol',
      symbol: 'ORN',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/11841/thumb/orion_logo.png?1594943318',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0258F474786DdFd37ABCE6df6BBb1Dd5dfC4434a',
          },
        },
      },
    },
    {
      name: 'Orchid',
      address: '0x9880e3dDA13c8e7D4804691A45160102d31F6060',
      symbol: 'OXT',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x4575f41308EC1483f3d399aa9a2826d74Da13Deb/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4575f41308EC1483f3d399aa9a2826d74Da13Deb',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x553d3D295e0f695B9228246232eDF400ed3560B5',
      name: 'PAX Gold',
      symbol: 'PAXG',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9519/thumb/paxg.PNG?1568542565',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x263534a4Fe3cb249dF46810718B7B612a30ebbff',
      name: 'Perpetual Protocol',
      symbol: 'PERP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12381/thumb/60d18e06844a844ad75901a9_mark_only_03.png?1628674771',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xbC396689893D065F41bc2C6EcbeE5e0085233447',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x8765f05ADce126d70bcdF1b0a48Db573316662eB',
      name: 'PlayDapp',
      symbol: 'PLA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14316/thumb/54023228.png?1615366911',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3a4f40631a4f906c2BaD353Ed06De7A5D3fCb430',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x7dc0cb65EC6019330a6841e9c274f2EE57A6CA6C',
      name: 'Pluton',
      symbol: 'PLU',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1241/thumb/pluton.png?1548331624',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD8912C10681D8B21Fd3742244f44658dBA12264E',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x8dc302e2141DA59c934d900886DbF1518Fd92cd4',
      name: 'Polkastarter',
      symbol: 'POLS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12648/thumb/polkastarter.png?1609813702',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x83e6f1E41cdd28eAcEB20Cb649155049Fac3D5Aa',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xcB059C5573646047D6d88dDdb87B745C18161d3b',
      name: 'Polymath',
      symbol: 'POLY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2784/thumb/inKkF01.png?1605007034',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9992eC3cF6A55b00978cdDF2b27BC6882d88D1eC',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Marlin',
      symbol: 'POND',
      logoURI:
        'https://assets.coingecko.com/coins/images/8903/thumb/POND_200x200.png?1622515451',
      address: '0x73580A2416A57f1C4b6391DBA688A9e4f7DBECE0',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x57B946008913B82E4dF85f501cbAeD910e58D26C',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0AaB8DC887D34f00D50E19aee48371a941390d14',
      name: 'Power Ledger',
      symbol: 'POWR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/1104/thumb/power-ledger.png?1547035082',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x595832F8FC6BF59c85C527fEC3740A1b7a361269',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x82FFdFD1d8699E8886a4e77CeFA9dd9710a7FefD',
      name: 'Propy',
      symbol: 'PRO',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/869/thumb/propy.png?1548332100',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x226bb599a12C826476e3A771454697EA52E9E220',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'PARSIQ',
      symbol: 'PRQ',
      logoURI:
        'https://assets.coingecko.com/coins/images/11973/thumb/DsNgK0O.png?1596590280',
      address: '0x9377Eeb7419486FD4D485671d50baa4BF77c2222',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x362bc847A3a9637d3af6624EeC853618a43ed7D2',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x36B77a184bE8ee56f5E81C56727B20647A42e28E',
      name: 'Quant',
      symbol: 'QNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3370/thumb/5ZOu7brX_400x400.jpg?1612437252',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4a220E6096B25EADb88358cb44068A3248254675',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x831753DD7087CaC61aB5644b308642cc1c33Dc13',
      name: 'Quickswap',
      symbol: 'QUICK',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13970/thumb/1_pOU6pBMEmiL-ZJVb0CYRjQ.png?1613386659',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6c28AeF8977c9B773996d0e8376d2EE379446F2f',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x2f81e176471CC57fDC76f7d332FB4511bF2bebDD',
      name: 'Radicle',
      symbol: 'RAD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14013/thumb/radicle.png?1614402918',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x31c8EAcBFFdD875c74b94b077895Bd78CF1E64A3',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x00e5646f60AC6Fb446f621d146B6E1886f002905',
      name: 'Rai Reflex Index',
      symbol: 'RAI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14004/thumb/RAI-logo-coin.png?1613592334',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x780053837cE2CeEaD2A90D9151aA21FC89eD49c2',
      name: 'Rarible',
      symbol: 'RARI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11845/thumb/Rari.png?1594946953',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xc3cFFDAf8F3fdF07da6D5e3A89B8723D5E385ff8',
      name: 'Rubic',
      symbol: 'RBC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12629/thumb/200x200.png?1607952509',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA4EED63db85311E22dF4473f87CcfC3DaDCFA3E3',
          },
        },
      },
    },
    {
      name: 'Republic Token',
      address: '0x19782D3Dc4701cEeeDcD90f0993f0A9126ed89d0',
      symbol: 'REN',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x408e41876cCCDC0F92210600ef50372656052a38/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x408e41876cCCDC0F92210600ef50372656052a38',
          },
        },
      },
    },
    {
      name: 'Reputation Augur v2',
      address: '0x6563c1244820CfBd6Ca8820FBdf0f2847363F733',
      symbol: 'REPv2',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x221657776846890989a759BA2973e427DfF5C9bB/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x221657776846890989a759BA2973e427DfF5C9bB',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xAdf2F2Ed91755eA3f4bcC9107a494879f633ae7C',
      name: 'Request',
      symbol: 'REQ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1031/thumb/Request_icon_green.png?1643250951',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8f8221aFbB33998d8584A2B05749bA73c37a938a',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'REVV',
      symbol: 'REVV',
      logoURI:
        'https://assets.coingecko.com/coins/images/12373/thumb/REVV_TOKEN_Refined_2021_%281%29.png?1627652390',
      address: '0x70c006878a5A50Ed185ac4C87d837633923De296',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x557B933a7C2c45672B610F8954A3deB39a51A8Ca',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x3b9dB434F08003A89554CDB43b3e0b1f8734BdE7',
      name: 'Rari Governance Token',
      symbol: 'RGT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12900/thumb/Rari_Logo_Transparent.png?1613978014',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD291E7a03283640FDc51b121aC401383A46cC623',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xbe662058e00849C3Eef2AC9664f37fEfdF2cdbFE',
      name: 'iExec RLC',
      symbol: 'RLC',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/646/thumb/pL1VuXm.png?1604543202',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x607F4C5BB672230e8672085532f7e901544a7375',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x76b8D57e5ac6afAc5D415a054453d1DD2c3C0094',
      name: 'Rally',
      symbol: 'RLY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12843/thumb/image.png?1611212077',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xf1f955016EcbCd7321c7266BccFB96c68ea5E49b',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x61299774020dA444Af134c82fa83E3810b309991',
      name: 'Render Token',
      symbol: 'RNDR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11636/thumb/rndr.png?1638840934',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Rook',
      symbol: 'ROOK',
      logoURI:
        'https://assets.coingecko.com/coins/images/13005/thumb/keeper_dao_logo.jpg?1604316506',
      address: '0xF92501c8213da1D6C74A76372CCc720Dc8818407',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xfA5047c9c78B8877af97BDcb85Db743fD7313d4a',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683',
      name: 'The Sandbox',
      symbol: 'SAND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12129/thumb/sandbox_logo.jpg?1597397942',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec',
      name: 'Shiba Inu',
      symbol: 'SHIB',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11939/thumb/shiba.png?1622619446',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0C7304fBAf2A320a1c50c46FE03752722F729946',
      name: 'Smooth Love Potion',
      symbol: 'SLP',
      decimals: 0,
      logoURI:
        'https://assets.coingecko.com/coins/images/10366/thumb/SLP.png?1578640057',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xCC8Fa225D80b9c7D42F96e9570156c65D6cAAa25',
          },
        },
      },
    },
    {
      name: 'Synthetix Network Token',
      address: '0x50B728D8D964fd00C2d0AAD81718b71311feF68a',
      symbol: 'SNX',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xcdB3C70CD25FD15307D84C4F9D37d5C043B33Fb2',
      name: 'Spell Token',
      symbol: 'SPELL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15861/thumb/abracadabra-3.png?1622544862',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x090185f2135308BaD17527004364eBcC2D37e5F6',
          },
        },
      },
    },
    {
      name: 'Storj Token',
      address: '0xd72357dAcA2cF11A5F155b9FF7880E595A3F5792',
      symbol: 'STORJ',
      decimals: 8,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xB36e3391B22a970d31A9b620Ae1A414C6c256d2a',
      name: 'Stox',
      symbol: 'STX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1230/thumb/stox-token.png?1547035256',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x006BeA43Baa3f7A6f765F14f10A1a1b08334EF45',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x60Ea918FC64360269Da4efBDA11d8fC6514617C6',
      name: 'SUKU',
      symbol: 'SUKU',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11969/thumb/UmfW5S6f_400x400.jpg?1596602238',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0763fdCCF1aE541A5961815C0872A8c5Bc6DE4d7',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xa1428174F516F527fafdD146b883bB4428682737',
      name: 'SuperFarm',
      symbol: 'SUPER',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14040/thumb/6YPdWn6.png?1613975899',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xe53EC727dbDEB9E2d5456c3be40cFF031AB40A55',
          },
        },
      },
    },
    {
      name: 'Synth sUSD',
      address: '0xF81b4Bec6Ca8f9fe7bE01CA734F55B2b6e03A7a0',
      symbol: 'sUSD',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://assets.coingecko.com/coins/images/5013/thumb/sUSD.png?1616150765',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
      name: 'Sushi',
      symbol: 'SUSHI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12271/thumb/512x512_Logo_no_chop.png?1606986688',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Swipe',
      symbol: 'SXP',
      logoURI:
        'https://assets.coingecko.com/coins/images/9368/thumb/swipe.png?1566792311',
      address: '0x6aBB753C1893194DE4a83c6e8B4EadFc105Fd5f5',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8CE9137d39326AD0cD6491fb5CC0CbA0e089b6A9',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xe1708AbDE4847B4929b70547E5197F1Ba1db2250',
      name: 'Tokemak',
      symbol: 'TOKE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17495/thumb/tokemak-avatar-200px-black.png?1628131614',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x2e9d63788249371f1DFC918a52f8d799F4a38C94',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xA7b98d63a137bF402b4570799ac4caD0BB1c4B1c',
      name: 'OriginTrail',
      symbol: 'TRAC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1877/thumb/TRAC.jpg?1635134367',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xaA7a9CA87d3694B5755f213B5D04094b8d0F0A6F',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xE3322702BEdaaEd36CdDAb233360B939775ae5f1',
      name: 'Tellor',
      symbol: 'TRB',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9644/thumb/Blk_icon_current.png?1584980686',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x8676815789211E799a6DC86d02748ADF9cF86836',
      name: 'Tribe',
      symbol: 'TRIBE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14575/thumb/tribe.PNG?1617487954',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0x5b77bCA482bd3E7958b1103d123888EfCCDaF803',
      name: 'TrueFi',
      symbol: 'TRU',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/13180/thumb/truefi_glyph_color.png?1617610941',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4C19596f5aAfF459fA38B0f7eD92F11AE6543784',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'The Virtua Kolect',
      symbol: 'TVK',
      logoURI:
        'https://assets.coingecko.com/coins/images/13330/thumb/virtua_original.png?1656043619',
      address: '0x5667dcC0ab74D1b1355C3b2061893399331B57e2',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xd084B83C305daFD76AE3E1b4E1F1fe2eCcCb3988',
          },
        },
      },
    },
    {
      name: 'UMA Voting Token v1',
      address: '0x3066818837c5e6eD6601bd5a91B0762877A6B731',
      symbol: 'UMA',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
          },
        },
      },
    },
    {
      name: 'Uniswap',
      address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
      symbol: 'UNI',
      decimals: 18,
      chainId: 137,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          },
        },
      },
    },
    {
      name: 'USDCoin',
      address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      symbol: 'USDC',
      decimals: 6,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    },
    {
      name: 'USDCoin (PoS)',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      symbol: 'USDC.e',
      decimals: 6,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
      },
    },
    {
      name: 'Tether USD',
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      decimals: 6,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xd0258a3fD00f38aa8090dfee343f10A9D4d30D3F',
      name: 'Voxies',
      symbol: 'VOXEL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/21260/large/voxies.png',
    },
    {
      name: 'Wrapped BTC',
      address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      symbol: 'WBTC',
      decimals: 8,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Wrapped Centrifuge',
      symbol: 'WCFG',
      logoURI:
        'https://assets.coingecko.com/coins/images/17106/thumb/WCFG.jpg?1626266462',
      address: '0x90bb6fEB70A9a43CfAaA615F856BA309FD759A90',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc221b7E65FfC80DE234bbB6667aBDd46593D34F0',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      symbol: 'WETH',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      name: 'Wrapped POL',
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      symbol: 'WPOL',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?1624446912',
    },
    {
      chainId: 137,
      name: 'WOO Network',
      symbol: 'WOO',
      logoURI:
        'https://assets.coingecko.com/coins/images/12921/thumb/w2UiemF__400x400.jpg?1603670367',
      address: '0x1B815d120B3eF02039Ee11dC2d33DE7aA4a8C603',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xDC3326e71D45186F113a2F448984CA0e8D201995',
      name: 'XSGD',
      symbol: 'XSGD',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/12832/standard/StraitsX_Singapore_Dollar_%28XSGD%29_Token_Logo.png?1696512623',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xd2507e7b5794179380673870d88B22F94da6abe0',
      name: 'XYO Network',
      symbol: 'XYO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4519/thumb/XYO_Network-logo.png?1547039819',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x55296f69f40Ea6d20E478533C15A6B08B654E758',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xDA537104D6A5edd53c6fBba9A898708E465260b6',
      name: 'yearn finance',
      symbol: 'YFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png?1598325330',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
          },
        },
      },
    },
    {
      chainId: 137,
      address: '0xb8cb8a7F4C2885C03e57E973C74827909Fdc2032',
      name: 'DFI money',
      symbol: 'YFII',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11902/thumb/YFII-logo.78631676.png?1598677348',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa1d0E215a23d7030842FC67cE582a6aFa3CCaB83',
          },
        },
      },
    },
    {
      chainId: 137,
      name: 'Yield Guild Games',
      symbol: 'YGG',
      logoURI:
        'https://assets.coingecko.com/coins/images/17358/thumb/le1nzlO6_400x400.jpg?1632465691',
      address: '0x82617aA52dddf5Ed9Bb7B370ED777b3182A30fd1',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x25f8087EAD173b73D6e8B84329989A8eEA16CF73',
          },
        },
      },
    },
    {
      name: '0x Protocol Token',
      address: '0x5559Edb74751A0edE9DeA4DC23aeE72cCA6bE3D5',
      symbol: 'ZRX',
      decimals: 18,
      chainId: 137,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xE41d2489571d322189246DaFA5ebDe1F4699F498/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0xc5fecC3a29Fb57B5024eEc8a2239d4621e111CBE',
      name: '1inch',
      symbol: '1INCH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0x97c806e7665d3AFd84A8Fe1837921403D59F3Dcc',
      name: 'Alethea Artificial Liquid Intelligence',
      symbol: 'ALI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22062/thumb/alethea-logo-transparent-colored.png?1642748848',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B0b3a982b4634aC68dD83a4DBF02311cE324181',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0x1C9Fa01e87487712706Fb469a13bEb234262C867',
      name: 'ARPA Chain',
      symbol: 'ARPA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/8506/thumb/9u0a23XY_400x400.jpg?1559027357',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBA50933C268F567BDC86E1aC131BE072C6B0b71a',
          },
        },
      },
    },
    {
      name: 'Balancer',
      address: '0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1',
      symbol: 'BAL',
      decimals: 18,
      chainId: 8453,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xba100000625a3754423978a60c9317c58a424e3D/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3D',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0xA7d68d155d17cB30e311367c2Ef1E82aB6022b67',
      name: 'Braintrust',
      symbol: 'BTRST',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18100/thumb/braintrust.PNG?1630475394',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x799ebfABE77a6E34311eeEe9825190B9ECe32824',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      name: 'Coinbase Wrapped Staked ETH',
      symbol: 'cbETH',
      decimals: 18,
      logoURI: 'https://ethereum-optimism.github.io/data/cbETH/logo.svg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
      name: 'Coinbase Wrapped Staked BTC',
      symbol: 'cbBTC',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/40143/standard/cbbtc.webp?1726136727',
    },
    {
      name: 'Compound',
      address: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
      symbol: 'COMP',
      decimals: 18,
      chainId: 8453,
      logoURI: 'https://ethereum-optimism.github.io/data/COMP/logo.svg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
          },
        },
      },
    },
    {
      name: 'Curve DAO Token',
      address: '0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415',
      symbol: 'CRV',
      decimals: 18,
      chainId: 8453,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD533a949740bb3306d119CC777fa900bA034cd52/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      symbol: 'DAI',
      decimals: 18,
      chainId: 8453,
      logoURI: 'https://ethereum-optimism.github.io/data/DAI/logo.svg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0xD08a2917653d4E460893203471f0000826fb4034',
      name: 'Harvest Finance',
      symbol: 'FARM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12304/thumb/Harvest.png?1613016180',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa0246c9032bC3A600820415aE600c6388619A14D',
          },
        },
      },
    },
    {
      chainId: 8453,
      name: 'Liquity USD',
      symbol: 'LUSD',
      logoURI:
        'https://assets.coingecko.com/coins/images/14666/thumb/Group_3.png?1617631327',
      address: '0x368181499736d0c0CC614DBB145E2EC1AC86b8c6',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0xfA980cEd6895AC314E7dE34Ef1bFAE90a5AdD21b',
      name: 'Prime',
      symbol: 'PRIME',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/29053/large/PRIMELOGOOO.png?1676976222',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xb23d80f5FefcDDaa212212F028021B41DEd428CF',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85',
      name: 'Seamlesss',
      symbol: 'SEAM',
      decimals: 18,
      logoURI: 'https://basescan.org/token/images/seamless_32.png',
    },
    {
      name: 'Synthetix Network Token',
      address: '0x22e6966B799c4D5B13BE962E1D117b56327FDa66',
      symbol: 'SNX',
      decimals: 18,
      chainId: 8453,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0x7D49a065D17d6d4a55dc13649901fdBB98B2AFBA',
      name: 'Sushi',
      symbol: 'SUSHI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12271/thumb/512x512_Logo_no_chop.png?1606986688',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
      name: 'tBTC',
      symbol: 'tBTC',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x18084fbA666a33d37592fA2633fD49a74DD93a88/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0xA81a52B4dda010896cDd386C7fBdc5CDc835ba23',
      name: 'OriginTrail',
      symbol: 'TRAC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1877/thumb/TRAC.jpg?1635134367',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xaA7a9CA87d3694B5755f213B5D04094b8d0F0A6F',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      name: 'USD Base Coin',
      symbol: 'USDbC',
      decimals: 6,
      logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
    },
    {
      name: 'USD Coin',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6,
      chainId: 8453,
      logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
      },
    },
    {
      chainId: 8453,
      name: 'Wrapped Ampleforth',
      symbol: 'WAMPL',
      logoURI:
        'https://assets.coingecko.com/coins/images/20825/thumb/photo_2021-11-25_02-05-11.jpg?1637811951',
      address: '0x489fe42C267fe0366B16b0c39e7AEEf977E841eF',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xEDB171C18cE90B633DB442f2A6F72874093b49Ef',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      decimals: 18,
      chainId: 8453,
      logoURI: 'https://ethereum-optimism.github.io/data/WETH/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      chainId: 8453,
      address: '0x9EaF8C1E34F05a589EDa6BAfdF391Cf6Ad3CB239',
      name: 'yearn finance',
      symbol: 'YFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png?1598325330',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
          },
        },
      },
    },
    {
      name: '0x Protocol Token',
      address: '0x3bB4445D30AC020a84c1b5A8A2C6248ebC9779D0',
      symbol: 'ZRX',
      decimals: 18,
      chainId: 8453,
      logoURI: 'https://ethereum-optimism.github.io/data/ZRX/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x6314C31A7a1652cE482cffe247E9CB7c3f4BB9aF',
      name: '1inch',
      symbol: '1INCH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
      name: 'Aave',
      symbol: 'AAVE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xFA5Ed56A203466CbBC2430a43c66b9D8723528E7',
      name: 'agEur',
      symbol: 'agEUR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19479/standard/agEUR.png?1696518915',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xb7910E8b16e63EFD51d5D1a093d56280012A3B9C',
      name: 'Adventure Gold',
      symbol: 'AGLD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18125/thumb/lpgblc4h_400x400.jpg?1630570955',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x32353A6C91143bfd6C7d363B546e62a9A2489A20',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xeC76E8fe6e2242e6c2117caA244B9e2DE1569923',
      name: 'AIOZ Network',
      symbol: 'AIOZ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14631/thumb/aioz_logo.png?1617413126',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x626E8036dEB333b408Be468F951bdB42433cBF18',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xe7dcD50836d0A28c959c72D72122fEDB8E245A6C',
      name: 'Aleph im',
      symbol: 'ALEPH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11676/thumb/Monochram-aleph.png?1608483725',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x27702a26126e0B3702af63Ee09aC4d1A084EF628',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xeF6124368c0B56556667e0de77eA008DfC0a71d1',
      name: 'Alethea Artificial Liquid Intelligence',
      symbol: 'ALI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22062/thumb/alethea-logo-transparent-colored.png?1642748848',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B0b3a982b4634aC68dD83a4DBF02311cE324181',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xC9CBf102c73fb77Ec14f8B4C8bd88e050a6b2646',
      name: 'Alpha Venture DAO',
      symbol: 'ALPHA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12738/thumb/AlphaToken_256x256.png?1617160876',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa1faa113cbE53436Df28FF0aEe54275c13B40975',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x1bfc5d35bf0f7B9e15dc24c78b8C02dbC1e95447',
      name: 'Ankr',
      symbol: 'ANKR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4324/thumb/U85xTl2.png?1608111978',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x74885b4D524d497261259B38900f54e6dbAd2210',
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg?1647476455',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xF01dB12F50D0CDF5Fe360ae005b9c52F92CA7811',
      name: 'API3',
      symbol: 'API3',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13256/thumb/api3.jpg?1606751424',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Arbitrum',
      address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      symbol: 'ARB',
      decimals: 18,
      logoURI: 'https://arbitrum.foundation/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xAC9Ac2C17cdFED4AbC80A53c5553388575714d03',
      name: 'Automata',
      symbol: 'ATA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15985/thumb/ATA.jpg?1622535745',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA2120b9e674d3fC3875f415A7DF52e382F141225',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x23ee2343B892b1BB63503a4FAbc840E0e2C6810f',
      name: 'Axelar',
      symbol: 'AXL',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/27277/large/V-65_xQ1_400x400.jpeg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x467719aD09025FcC6cF6F8311755809d45a5E5f3',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xe88998Fb579266628aF6a03e3821d5983e5D0089',
      name: 'Axie Infinity',
      symbol: 'AXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13029/thumb/axie_infinity_logo.png?1604471082',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xBfa641051Ba0a0Ad1b0AcF549a89536A0D76472E',
      name: 'Badger DAO',
      symbol: 'BADGER',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13287/thumb/badger_dao_logo.jpg?1607054976',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3472A5A71965499acd81997a54BBA8D852C6E53d',
          },
        },
      },
    },
    {
      name: 'Balancer',
      address: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
      symbol: 'BAL',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xba100000625a3754423978a60c9317c58a424e3D/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3D',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x3450687EF141dCd6110b77c2DC44B008616AeE75',
      name: 'Basic Attention Token',
      symbol: 'BAT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xa68Ec98D7ca870cF1Dd0b00EBbb7c4bF60A8e74d',
      name: 'Biconomy',
      symbol: 'BICO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/21061/thumb/biconomy_logo.jpg?1638269749',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF17e65822b568B3903685a7c9F496CF7656Cc6C2',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x406C8dB506653D882295875F633bEC0bEb921C2A',
      name: 'BitDAO',
      symbol: 'BIT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17627/thumb/rI_YptK8.png?1653983088',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1A4b46696b2bB4794Eb3D4c26f1c55F9170fa4C5',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xEf171a5BA71348eff16616fd692855c2Fe606EB2',
      name: 'Blur',
      symbol: 'BLUR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/28453/large/blur.png?1670745921',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5283D291DBCF85356A21bA090E6db59121208b44',
          },
        },
      },
    },
    {
      name: 'Bancor Network Token',
      address: '0x7A24159672b83ED1b89467c9d6A99556bA06D073',
      symbol: 'BNT',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x0D81E50bC677fa67341c44D7eaA9228DEE64A4e1',
      name: 'BarnBridge',
      symbol: 'BOND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12811/thumb/barnbridge.jpg?1602728853',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0391D2021f89DC339F60Fff84546EA23E337750f',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x31190254504622cEFdFA55a7d3d272e6462629a2',
      name: 'Binance USD',
      symbol: 'BUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9576/thumb/BUSD.png?1568947766',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x1DEBd73E752bEaF79865Fd6446b0c970EaE7732f',
      name: 'Coinbase Wrapped Staked ETH',
      symbol: 'cbETH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/27008/large/cbeth.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x4E51aC49bC5e2d87e0EF713E9e5AB2D71EF4F336',
      name: 'Celo native asset (Wormhole)',
      symbol: 'CELO',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/wormhole-foundation/wormhole-token-list/main/assets/celo_wh.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3294395e62F4eB6aF3f1Fcf89f5602D90Fb3Ef69',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x3a8B787f78D775AECFEEa15706D4221B40F345AB',
      name: 'Celer Network',
      symbol: 'CELR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4379/thumb/Celr.png?1554705437',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4F9254C83EB525f9FCf346490bbb3ed28a81C667',
          },
        },
      },
    },
    {
      name: 'Compound',
      address: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
      symbol: 'COMP',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x6FE14d3CC2f7bDdffBa5CdB3BBE7467dd81ea101',
      name: 'COTI',
      symbol: 'COTI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2962/thumb/Coti.png?1559653863',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xDDB3422497E61e13543BeA06989C0789117555c5',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x8ea3156f834A0dfC78F1A5304fAC2CdA676F354C',
      name: 'Cronos',
      symbol: 'CRO',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/7310/thumb/oCw2s3GI_400x400.jpeg?1645172042',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b',
          },
        },
      },
    },
    {
      name: 'Curve DAO Token',
      address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
      symbol: 'CRV',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD533a949740bb3306d119CC777fa900bA034cd52/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x319f865b287fCC10b30d8cE6144e8b6D1b476999',
      name: 'Cartesi',
      symbol: 'CTSI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11038/thumb/cartesi.png?1592288021',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x84F5c2cFba754E76DD5aE4fB369CfC920425E12b',
      name: 'Cryptex Finance',
      symbol: 'CTX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14932/thumb/glossy_icon_-_C200px.png?1619073171',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x321C2fE4446C7c963dc41Dd58879AF648838f98D',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x9DfFB23CAd3322440bCcFF7aB1C58E781dDBF144',
      name: 'Civic',
      symbol: 'CVC',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/788/thumb/civic.png?1547034556',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x41e5560054824eA6B0732E656E3Ad64E20e94E45',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xaAFcFD42c9954C6689ef1901e03db742520829c5',
      name: 'Convex Finance',
      symbol: 'CVX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15585/thumb/convex.png?1621256328',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      symbol: 'DAI',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x3Be7cB2e9413Ef8F42b4A202a0114EB59b64e227',
      name: 'DexTools',
      symbol: 'DEXT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11603/thumb/dext.png?1605790188',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xfB7B4564402E5500dB5bB6d63Ae671302777C75a',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xca642467C6Ebe58c13cB4A7091317f34E17ac05e',
      name: 'DIA',
      symbol: 'DIA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11955/thumb/image.png?1646041751',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xE3696a02b2C9557639E29d829E9C45EFa49aD47A',
      name: 'district0x',
      symbol: 'DNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/849/thumb/district0x.png?1547223762',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0AbdAce70D3790235af448C88547603b945604ea',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x4667cf53C4eDF659E402B733BEA42B18B68dd74c',
      name: 'DeFi Pulse Index',
      symbol: 'DPI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12465/thumb/defi_pulse_index_set.png?1600051053',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x51863cB90Ce5d6dA9663106F292fA27c8CC90c5a',
      name: 'dYdX',
      symbol: 'DYDX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17500/thumb/hjnIm9bV.jpg?1628009360',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x92D6C1e31e14520e676a687F0a93788B716BEff5',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x3e4Cff6E50F37F731284A92d44AE943e17077fD4',
      name: 'Dogelon Mars',
      symbol: 'ELON',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14962/thumb/6GxcPRo3_400x400.jpg?1619157413',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x7fa9549791EFc9030e1Ed3F25D18014163806758',
      name: 'Enjin Coin',
      symbol: 'ENJ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1102/thumb/enjin-coin-logo.png?1547035078',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28',
      name: 'Ethereum Name Service',
      symbol: 'ENS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19785/thumb/acatxTm8_400x400.jpg?1635850140',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x2354c8e9Ea898c751F1A15Addeb048714D667f96',
      name: 'Ethernity Chain',
      symbol: 'ERN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14238/thumb/LOGO_HIGH_QUALITY.png?1647831402',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBBc2AE13b23d715c30720F079fcd9B4a74093505',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x863708032B5c328e11aBcbC0DF9D79C71Fc52a48',
      name: 'Euro Coin',
      symbol: 'EURC',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/26045/standard/euro.png?1696525125',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x8553d254Cb6934b16F87D2e486b64BbD24C83C70',
      name: 'Harvest Finance',
      symbol: 'FARM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12304/thumb/Harvest.png?1613016180',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa0246c9032bC3A600820415aE600c6388619A14D',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x4BE87C766A7CE11D5Cc864b6C3Abb7457dCC4cC9',
      name: 'Fetch ai',
      symbol: 'FET',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/5681/thumb/Fetch.jpg?1572098136',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x849B40AB2469309117Ed1038c5A99894767C7282',
      name: 'Stafi',
      symbol: 'FIS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12423/thumb/stafi_logo.jpg?1599730991',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xef3A930e1FfFFAcd2fc13434aC81bD278B0ecC8d',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x3A1429d50E0cBBc45c997aF600541Fe1cc3D2923',
      name: 'Forta',
      symbol: 'FORT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/25060/thumb/Forta_lgo_%281%29.png?1655353696',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x41545f8b9472D758bB669ed8EaEEEcD7a9C4Ec29',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xf929de51D91C77E42f5090069E0AD7A09e513c73',
      name: 'ShapeShift FOX Token',
      symbol: 'FOX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9988/thumb/FOX.png?1574330622',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305',
      name: 'Frax',
      symbol: 'FRAX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13422/thumb/frax_logo.png?1608476506',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xd42785D323e608B9E99fa542bd8b1000D4c2Df37',
      name: 'Fantom',
      symbol: 'FTM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4001/thumb/Fantom.png?1558015016',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4E15361FD6b4BB609Fa63C81A2be19d873717870',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xd9f9d2Ee2d3EFE420699079f16D9e924affFdEA4',
      name: 'Frax Share',
      symbol: 'FXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13423/thumb/frax_share.png?1608478989',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xc27E7325a6BEA1FcC06de7941473f5279bfd1182',
      name: 'Project Galaxy',
      symbol: 'GAL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/24530/thumb/GAL-Token-Icon.png?1651483533',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5fAa989Af96Af85384b8a938c2EdE4A7378D9875',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x2A676eeAd159c4C8e8593471c6d666F02827FF8C',
      name: 'GALA',
      symbol: 'GALA',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/12493/standard/GALA-COINGECKO.png?1696512310',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xd1d2Eb1B1e90B638588728b4130137D262C87cae',
          },
        },
      },
    },
    {
      name: 'GMX',
      address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      symbol: 'GMX',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://assets.coingecko.com/coins/images/18323/large/arbit.png?1631532468',
    },
    {
      name: 'Gnosis Token',
      address: '0xa0b862F60edEf4452F25B4160F177db44DeB6Cf1',
      symbol: 'GNO',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6810e776880C02933D47DB1b9fc05908e5386b96/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6810e776880C02933D47DB1b9fc05908e5386b96',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7',
      name: 'The Graph',
      symbol: 'GRT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13397/thumb/Graph_Token.png?1608145566',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x7f9a7DB853Ca816B9A138AEe3380Ef34c437dEe0',
      name: 'Gitcoin',
      symbol: 'GTC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15810/thumb/gitcoin.png?1621992929',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x589d35656641d6aB57A545F08cf473eCD9B6D5F7',
      name: 'GYEN',
      symbol: 'GYEN',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/14191/thumb/icon_gyen_200_200.png?1614843343',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC08512927D12348F6620a698105e1BAac6EcD911',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xd12Eeb0142D4Efe7Af82e4f29E5Af382615bcEeA',
      name: 'Highstreet',
      symbol: 'HIGH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18973/thumb/logosq200200Coingecko.png?1634090470',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x71Ab77b7dbB4fa7e017BC15090b2163221420282',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'HOPR',
      symbol: 'HOPR',
      logoURI:
        'https://assets.coingecko.com/coins/images/14061/thumb/Shared_HOPR_logo_512px.png?1614073468',
      address: '0x177F394A3eD18FAa85c1462Ae626438a70294EF7',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF5581dFeFD8Fb0e4aeC526bE659CFaB1f8c781dA',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x61cA9D186f6b9a793BC08F6C79fd35f205488673',
      name: 'Illuvium',
      symbol: 'ILV',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/14468/large/ILV.JPG',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x3cFD99593a7F035F717142095a3898e3Fca7783e',
      name: 'Immutable X',
      symbol: 'IMX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/17233/thumb/imx.png?1636691817',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x2A2053cb633CAD465B4A8975eD3d7f09DF608F80',
      name: 'Injective',
      symbol: 'INJ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12882/thumb/Secondary_Symbol.png?1628233237',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x25f05699548D3A0820b99f93c10c8BB573E27083',
      name: 'JasmyCoin',
      symbol: 'JASMY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13876/thumb/JASMY200x200.jpg?1612473259',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60',
      name: 'Lido DAO',
      symbol: 'LDO',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13573/thumb/Lido_DAO.png?1609873644',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
          },
        },
      },
    },
    {
      name: 'ChainLink Token',
      address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
      symbol: 'LINK',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x289ba1701C2F088cf0faf8B3705246331cB8A839',
      name: 'Livepeer',
      symbol: 'LPT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/7137/thumb/logo-circle-green.png?1619593365',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xfb9E5D956D889D91a82737B9bFCDaC1DCE3e1449',
      name: 'Liquity',
      symbol: 'LQTY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14665/thumb/200-lqty-icon.png?1617631180',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D',
          },
        },
      },
    },
    {
      name: 'LoopringCoin V2',
      address: '0x46d0cE7de6247b0A95f67b43B589b4041BaE7fbE',
      symbol: 'LRC',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Liquity USD',
      symbol: 'LUSD',
      logoURI:
        'https://assets.coingecko.com/coins/images/14666/thumb/Group_3.png?1617631327',
      address: '0x93b346b6BC2548dA6A1E7d98E9a421B42541425b',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
          },
        },
      },
    },
    {
      name: 'MAGIC',
      address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
      symbol: 'MAGIC',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://dynamic-assets.coinbase.com/30320a63f6038b944c9c0202fcb2392e6a1bd333814f74b4674774dd87f2d06d64fdd74c2f1ab4639917c75b749c323450408bec7a2737af8ae0c17871aa90de/asset_icons/98d278cda11639ed7449a0a3086cd2c83937ce71baf4ee43bb5b777423c00a75.png',
    },
    {
      chainId: 42161,
      address: '0x442d24578A564EF628A65e6a7E3e7be2a165E231',
      name: 'Decentraland',
      symbol: 'MANA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/878/thumb/decentraland-mana.png?1550108745',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x533A7B414CD1236815a5e09F1E97FC7d5c313739',
      name: 'Mask Network',
      symbol: 'MASK',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14051/thumb/Mask_Network.jpg?1614050316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x69af81e73A73B40adF4f3d4223Cd9b1ECE623074',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'MATH',
      symbol: 'MATH',
      logoURI:
        'https://assets.coingecko.com/coins/images/11335/thumb/2020-05-19-token-200.png?1589940590',
      address: '0x99F40b01BA9C469193B360f72740E416B17Ac332',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x08d967bb0134F2d07f7cfb6E246680c53927DD30',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x561877b6b3DD7651313794e5F2894B2F18bE0766',
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?1624446912',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Metis',
      symbol: 'METIS',
      logoURI:
        'https://assets.coingecko.com/coins/images/15595/thumb/metis.jpeg?1660285312',
      address: '0x7F728F3595db17B0B359f4FC47aE80FAd2e33769',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9E32b13ce7f2E80A01932B42553652E053D6ed8e',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xB20A02dfFb172C474BC4bDa3fD6f4eE70C04daf2',
      name: 'Magic Internet Money',
      symbol: 'MIM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/16786/thumb/mimlogopng.png?1624979612',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
          },
        },
      },
    },
    {
      name: 'Maker',
      address: '0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879',
      symbol: 'MKR',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x8f5c1A99b1df736Ad685006Cb6ADCA7B7Ae4b514',
      name: 'Melon',
      symbol: 'MLN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/605/thumb/melon.png?1547034295',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xec67005c4E498Ec7f55E092bd1d35cbC47C91892',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x29024832eC3baBF5074D4F46102aA988097f0Ca0',
      name: 'Maple',
      symbol: 'MPL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14097/thumb/photo_2021-05-03_14.20.41.jpeg?1620022863',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x33349B282065b0284d756F0577FB39c158F935e6',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x7b9b94aebe5E2039531af8E31045f377EcD9A39A',
      name: 'Multichain',
      symbol: 'MULTI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22087/thumb/1_Wyot-SDGZuxbjdkaOeT2-A.png?1640764238',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x65Ef703f5594D2573eb71Aaf55BC0CB548492df4',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'MXC',
      symbol: 'MXC',
      logoURI:
        'https://assets.coingecko.com/coins/images/4604/thumb/mxc.png?1655534336',
      address: '0x91b468Fe3dce581D7a6cFE34189F1314b6862eD6',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5Ca381bBfb58f0092df149bD3D243b08B9a8386e',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x53236015A675fcB937485F1AE58040e4Fb920d5b',
      name: 'PolySwarm',
      symbol: 'NCT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2843/thumb/ImcYCVfX_400x400.jpg?1628519767',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9E46A38F5DaaBe8683E10793b06749EEF7D733d1',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xBE06ca305A5Cb49ABf6B1840da7c42690406177b',
      name: 'NKN',
      symbol: 'NKN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3375/thumb/nkn.png?1548329212',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb',
          },
        },
      },
    },
    {
      name: 'Numeraire',
      address: '0x597701b32553b9fa473e21362D480b3a6B569711',
      symbol: 'NMR',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x933d31561e470478079FEB9A6Dd2691fAD8234DF',
      name: 'Ocean Protocol',
      symbol: 'OCEAN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3687/thumb/ocean-protocol-logo.jpg?1547038686',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x6FEb262FEb0f775B5312D2e009923f7f58AE423E',
      name: 'Origin Protocol',
      symbol: 'OGN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3296/thumb/op.jpg?1547037878',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xd962C1895c46AC0378C502c207748b7061421e8e',
      name: 'OMG Network',
      symbol: 'OMG',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/776/thumb/OMG_Network.jpg?1591167168',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x1BDCC2075d5370293E248Cab0173eC3E551e6218',
      name: 'Orion Protocol',
      symbol: 'ORN',
      decimals: 8,
      logoURI:
        'https://assets.coingecko.com/coins/images/11841/thumb/orion_logo.png?1594943318',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0258F474786DdFd37ABCE6df6BBb1Dd5dfC4434a',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
      name: 'PAX Gold',
      symbol: 'PAXG',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9519/thumb/paxg.PNG?1568542565',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x35E6A59F786d9266c7961eA28c7b768B33959cbB',
      name: 'Pepe',
      symbol: 'PEPE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1682922725',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x753D224bCf9AAFaCD81558c32341416df61D3DAC',
      name: 'Perpetual Protocol',
      symbol: 'PERP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12381/thumb/60d18e06844a844ad75901a9_mark_only_03.png?1628674771',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xbC396689893D065F41bc2C6EcbeE5e0085233447',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xeeeB5EaC2dB7A7Fc28134aA3248580d48b016b64',
      name: 'Polkastarter',
      symbol: 'POLS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12648/thumb/polkastarter.png?1609813702',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x83e6f1E41cdd28eAcEB20Cb649155049Fac3D5Aa',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xE12F29704F635F4A6E7Ae154838d21F9B33809e9',
      name: 'Polymath',
      symbol: 'POLY',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/2784/thumb/inKkF01.png?1605007034',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9992eC3cF6A55b00978cdDF2b27BC6882d88D1eC',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Marlin',
      symbol: 'POND',
      logoURI:
        'https://assets.coingecko.com/coins/images/8903/thumb/POND_200x200.png?1622515451',
      address: '0xdA0a57B710768ae17941a9Fa33f8B720c8bD9ddD',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x57B946008913B82E4dF85f501cbAeD910e58D26C',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x4e91F2AF1ee0F84B529478f19794F5AFD423e4A6',
      name: 'Power Ledger',
      symbol: 'POWR',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/1104/thumb/power-ledger.png?1547035082',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x595832F8FC6BF59c85C527fEC3740A1b7a361269',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x8d8e1b6ffc6832E8D2eF0DE8a3d957cAE7ac5067',
      name: 'Prime',
      symbol: 'PRIME',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/29053/large/PRIMELOGOOO.png?1676976222',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xb23d80f5FefcDDaa212212F028021B41DEd428CF',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'PARSIQ',
      symbol: 'PRQ',
      logoURI:
        'https://assets.coingecko.com/coins/images/11973/thumb/DsNgK0O.png?1596590280',
      address: '0x82164a8B646401a8776F9dC5c8Cba35DcAf60Cd2',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x362bc847A3a9637d3af6624EeC853618a43ed7D2',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xC7557C73e0eCa2E1BF7348bB6874Aee63C7eFF85',
      name: 'Quant',
      symbol: 'QNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/3370/thumb/5ZOu7brX_400x400.jpg?1612437252',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4a220E6096B25EADb88358cb44068A3248254675',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xaeF5bbcbFa438519a5ea80B4c7181B4E78d419f2',
      name: 'Rai Reflex Index',
      symbol: 'RAI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14004/thumb/RAI-logo-coin.png?1613592334',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xCF8600347Dc375C5f2FdD6Dab9BB66e0b6773cd7',
      name: 'Rarible',
      symbol: 'RARI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11845/thumb/Rari.png?1594946953',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x2E9AE8f178d5Ea81970C7799A377B3985cbC335F',
      name: 'Rubic',
      symbol: 'RBC',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12629/thumb/200x200.png?1607952509',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA4EED63db85311E22dF4473f87CcfC3DaDCFA3E3',
          },
        },
      },
    },
    {
      name: 'Republic Token',
      address: '0x9fA891e1dB0a6D1eEAC4B929b5AAE1011C79a204',
      symbol: 'REN',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x408e41876cCCDC0F92210600ef50372656052a38/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x408e41876cCCDC0F92210600ef50372656052a38',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x1Cb5bBc64e148C5b889E3c667B49edF78BB92171',
      name: 'Request',
      symbol: 'REQ',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/1031/thumb/Request_icon_green.png?1643250951',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8f8221aFbB33998d8584A2B05749bA73c37a938a',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xef888bcA6AB6B1d26dbeC977C455388ecd794794',
      name: 'Rari Governance Token',
      symbol: 'RGT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12900/thumb/Rari_Logo_Transparent.png?1613978014',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD291E7a03283640FDc51b121aC401383A46cC623',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xE575586566b02A16338c199c23cA6d295D794e66',
      name: 'iExec RLC',
      symbol: 'RLC',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/646/thumb/pL1VuXm.png?1604543202',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x607F4C5BB672230e8672085532f7e901544a7375',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xC8a4EeA31E9B6b61c406DF013DD4FEc76f21E279',
      name: 'Render Token',
      symbol: 'RNDR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11636/thumb/rndr.png?1638840934',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xd1318eb19DBF2647743c720ed35174efd64e3DAC',
      name: 'The Sandbox',
      symbol: 'SAND',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12129/thumb/sandbox_logo.jpg?1597397942',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x5033833c9fe8B9d3E09EEd2f73d2aaF7E3872fd1',
      name: 'Shiba Inu',
      symbol: 'SHIB',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11939/thumb/shiba.png?1622619446',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x4F9b7DEDD8865871dF65c5D26B1c2dD537267878',
      name: 'SKALE',
      symbol: 'SKL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13245/thumb/SKALE_token_300x300.png?1606789574',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x00c83aeCC790e8a4453e5dD3B0B4b3680501a7A7',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x707F635951193dDaFBB40971a0fCAAb8A6415160',
      name: 'Status',
      symbol: 'SNT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/779/thumb/status.png?1548610778',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x744d70FDBE2Ba4CF95131626614a1763DF805B9E',
          },
        },
      },
    },
    {
      name: 'Synthetix Network Token',
      address: '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60',
      symbol: 'SNX',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xb2BE52744a804Cc732d606817C2572C5A3B264e7',
      name: 'Unisocks',
      symbol: 'SOCKS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/10717/thumb/qFrcoiM.png?1582525244',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x23B608675a2B2fB1890d3ABBd85c5775c51691d5',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xb74Da9FE2F96B9E0a5f4A3cf0b92dd2bEC617124',
      name: 'SOL Wormhole ',
      symbol: 'SOL',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/22876/thumb/SOL_wh_small.png?1644224316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF',
      name: 'Spell Token',
      symbol: 'SPELL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15861/thumb/abracadabra-3.png?1622544862',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x090185f2135308BaD17527004364eBcC2D37e5F6',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Stargate Finance',
      symbol: 'STG',
      logoURI:
        'https://assets.coingecko.com/coins/images/24413/thumb/STG_LOGO.png?1647654518',
      address: '0xe018C7a3d175Fb0fE15D70Da2c874d3CA16313EC',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6',
          },
        },
      },
    },
    {
      name: 'Storj Token',
      address: '0xE6320ebF209971b4F4696F7f0954b8457Aa2FCC2',
      symbol: 'STORJ',
      decimals: 8,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x7f9cf5a2630a0d58567122217dF7609c26498956',
      name: 'SuperFarm',
      symbol: 'SUPER',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14040/thumb/6YPdWn6.png?1613975899',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xe53EC727dbDEB9E2d5456c3be40cFF031AB40A55',
          },
        },
      },
    },
    {
      name: 'Synth sUSD',
      address: '0xA970AF1a584579B618be4d69aD6F73459D112F95',
      symbol: 'sUSD',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://assets.coingecko.com/coins/images/5013/thumb/sUSD.png?1616150765',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
      name: 'Sushi',
      symbol: 'SUSHI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12271/thumb/512x512_Logo_no_chop.png?1606986688',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x1bCfc0B4eE1471674cd6A9F6B363A034375eAD84',
      name: 'Synapse',
      symbol: 'SYN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18024/thumb/syn.png?1635002049',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0f2D719407FdBeFF09D87557AbB7232601FD9F29',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Threshold Network',
      symbol: 'T',
      logoURI:
        'https://assets.coingecko.com/coins/images/22228/thumb/nFPNiSbL_400x400.jpg?1641220340',
      address: '0x0945Cae3ae47cb384b2d47BC448Dc6A9dEC21F55',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x7E2a1eDeE171C5B19E6c54D73752396C0A572594',
      name: 'tBTC',
      symbol: 'tBTC',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x18084fbA666a33d37592fA2633fD49a74DD93a88/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xd58D345Fd9c82262E087d2D0607624B410D88242',
      name: 'Tellor',
      symbol: 'TRB',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9644/thumb/Blk_icon_current.png?1584980686',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xBfAE6fecD8124ba33cbB2180aAb0Fe4c03914A5A',
      name: 'Tribe',
      symbol: 'TRIBE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14575/thumb/tribe.PNG?1617487954',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B',
          },
        },
      },
    },
    {
      name: 'UMA Voting Token v1',
      address: '0xd693Ec944A85eeca4247eC1c3b130DCa9B0C3b22',
      symbol: 'UMA',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
          },
        },
      },
    },
    {
      name: 'Uniswap',
      address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
      symbol: 'UNI',
      decimals: 18,
      chainId: 42161,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          },
        },
      },
    },
    {
      name: 'USDCoin',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      decimals: 6,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
      },
    },
    {
      name: 'Bridged USDC',
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      symbol: 'USDC.e',
      decimals: 6,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    },
    {
      name: 'Tether USD',
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      decimals: 6,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Wrapped Ampleforth',
      symbol: 'WAMPL',
      logoURI:
        'https://assets.coingecko.com/coins/images/20825/thumb/photo_2021-11-25_02-05-11.jpg?1637811951',
      address: '0x1c8Ec4DE3c2BFD3050695D89853EC6d78AE650bb',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xEDB171C18cE90B633DB442f2A6F72874093b49Ef',
          },
        },
      },
    },
    {
      name: 'Wrapped BTC',
      address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      symbol: 'WBTC',
      decimals: 8,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'WOO Network',
      symbol: 'WOO',
      logoURI:
        'https://assets.coingecko.com/coins/images/12921/thumb/w2UiemF__400x400.jpg?1603670367',
      address: '0xcAFcD85D8ca7Ad1e1C6F82F651fA15E33AEfD07b',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
          },
        },
      },
    },
    {
      chainId: 42161,
      name: 'Chain',
      symbol: 'XCN',
      logoURI:
        'https://assets.coingecko.com/coins/images/24210/thumb/Chain_icon_200x200.png?1646895054',
      address: '0x58BbC087e36Db40a84b22c1B93a042294deEAFEd',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0xa05245Ade25cC1063EE50Cf7c083B4524c1C4302',
      name: 'XSGD',
      symbol: 'XSGD',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/12832/standard/StraitsX_Singapore_Dollar_%28XSGD%29_Token_Logo.png?1696512623',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96',
          },
        },
      },
    },
    {
      chainId: 42161,
      address: '0x82e3A8F066a6989666b031d916c43672085b1582',
      name: 'yearn finance',
      symbol: 'YFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png?1598325330',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
          },
        },
      },
    },
    {
      name: '0x Protocol Token',
      address: '0xBD591Bd4DdB64b77B5f76Eab8f03d02519235Ae2',
      symbol: 'ZRX',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xE41d2489571d322189246DaFA5ebDe1F4699F498/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
          },
        },
      },
    },
    {
      chainId: 42220,
      address: '0xD629eb00dEced2a080B7EC630eF6aC117e614f1b',
      name: 'Wrapped Bitcoin',
      symbol: 'BTC',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_WBTC.png',
    },
    {
      chainId: 42220,
      address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      name: 'Celo',
      symbol: 'CELO',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_CELO.png',
    },
    {
      name: 'Wrapped Ether',
      address: '0x2DEf4285787d58a2f811AF24755A8150622f4361',
      symbol: 'WETH',
      decimals: 18,
      chainId: 42220,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0xd501281565bf7789224523144Fe5D98e8B28f267',
      name: '1inch',
      symbol: '1INCH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9',
      name: 'Aave',
      symbol: 'AAVE',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0xAEC8318a9a59bAEb39861d10ff6C7f7bf1F96C57',
      name: 'agEur',
      symbol: 'agEUR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/19479/standard/agEUR.png?1696518915',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x2147EFFF675e4A4eE1C2f918d181cDBd7a8E208f',
      name: 'Alpha Venture DAO',
      symbol: 'ALPHA',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12738/thumb/AlphaToken_256x256.png?1617160876',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xa1faa113cbE53436Df28FF0aEe54275c13B40975',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x20CF1b6E9d856321ed4686877CF4538F2C84B4dE',
      name: 'Ankr',
      symbol: 'ANKR',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/4324/thumb/U85xTl2.png?1608111978',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x44c784266cf024a60e8acF2427b9857Ace194C5d',
      name: 'Axelar',
      symbol: 'AXL',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/27277/large/V-65_xQ1_400x400.jpeg',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x467719aD09025FcC6cF6F8311755809d45a5E5f3',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x98443B96EA4b0858FDF3219Cd13e98C7A4690588',
      name: 'Basic Attention Token',
      symbol: 'BAT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39',
      name: 'Binance USD',
      symbol: 'BUSD',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/9576/thumb/BUSD.png?1568947766',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
          },
        },
      },
    },
    {
      name: 'Compound',
      address: '0xc3048E19E76CB9a3Aa9d77D8C03c29Fc906e2437',
      symbol: 'COMP',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x6b289CCeAA8639e3831095D75A3e43520faBf552',
      name: 'Cartesi',
      symbol: 'CTSI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11038/thumb/cartesi.png?1592288021',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D',
          },
        },
      },
    },
    {
      name: 'DAI.e Token',
      address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
      symbol: 'DAI.e',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/avalanchec/assets/0xd586E7F844cEa2F87f50152665BCbc2C279D8d70/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17',
      name: 'DeFi Yield Protocol',
      symbol: 'DYP',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13480/thumb/DYP_Logo_Symbol-8.png?1655809066',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD',
      name: 'Euro Coin',
      symbol: 'EURC',
      decimals: 6,
      logoURI:
        'https://assets.coingecko.com/coins/images/26045/standard/euro.png?1696525125',
    },
    {
      chainId: 43114,
      address: '0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64',
      name: 'Frax',
      symbol: 'FRAX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13422/thumb/frax_logo.png?1608476506',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x214DB107654fF987AD859F34125307783fC8e387',
      name: 'Frax Share',
      symbol: 'FXS',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13423/thumb/frax_share.png?1608478989',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x62edc0692BD897D2295872a9FFCac5425011c661',
      name: 'GMX',
      symbol: 'GMX',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18323/large/arbit.png?1631532468',
    },
    {
      chainId: 43114,
      address: '0x8a0cAc13c7da965a312f08ea4229c37869e85cB9',
      name: 'The Graph',
      symbol: 'GRT',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/13397/thumb/Graph_Token.png?1608145566',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
          },
        },
      },
    },
    {
      name: 'ChainLink Token',
      address: '0x5947BB275c521040051D82396192181b413227A3',
      symbol: 'LINK',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x130966628846BFd36ff31a822705796e8cb8C18D',
      name: 'Magic Internet Money',
      symbol: 'MIM',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/16786/thumb/mimlogopng.png?1624979612',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
          },
        },
      },
    },
    {
      name: 'Maker',
      address: '0x88128fd4b259552A9A1D457f435a6527AAb72d42',
      symbol: 'MKR',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x9Fb9a33956351cf4fa040f65A13b835A3C8764E3',
      name: 'Multichain',
      symbol: 'MULTI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22087/thumb/1_Wyot-SDGZuxbjdkaOeT2-A.png?1640764238',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x65Ef703f5594D2573eb71Aaf55BC0CB548492df4',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x97Cd1CFE2ed5712660bb6c14053C0EcB031Bff7d',
      name: 'Rai Reflex Index',
      symbol: 'RAI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/14004/thumb/RAI-logo-coin.png?1613592334',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919',
          },
        },
      },
    },
    {
      name: 'Synthetix Network Token',
      address: '0xBeC243C995409E6520D7C41E404da5dEba4b209B',
      symbol: 'SNX',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0xFE6B19286885a4F7F55AdAD09C3Cd1f906D2478F',
      name: 'SOL Wormhole ',
      symbol: 'SOL',
      decimals: 9,
      logoURI:
        'https://assets.coingecko.com/coins/images/22876/thumb/SOL_wh_small.png?1644224316',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0xCE1bFFBD5374Dac86a2893119683F4911a2F7814',
      name: 'Spell Token',
      symbol: 'SPELL',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/15861/thumb/abracadabra-3.png?1622544862',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x090185f2135308BaD17527004364eBcC2D37e5F6',
          },
        },
      },
    },
    {
      chainId: 43114,
      name: 'Stargate Finance',
      symbol: 'STG',
      logoURI:
        'https://assets.coingecko.com/coins/images/24413/thumb/STG_LOGO.png?1647654518',
      address: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x37B608519F91f70F2EeB0e5Ed9AF4061722e4F76',
      name: 'Sushi',
      symbol: 'SUSHI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12271/thumb/512x512_Logo_no_chop.png?1606986688',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x1f1E7c893855525b303f99bDF5c3c05Be09ca251',
      name: 'Synapse',
      symbol: 'SYN',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/18024/thumb/syn.png?1635002049',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0f2D719407FdBeFF09D87557AbB7232601FD9F29',
          },
        },
      },
    },
    {
      name: 'UMA Voting Token v1',
      address: '0x3Bd2B1c7ED8D396dbb98DED3aEbb41350a5b2339',
      symbol: 'UMA',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
          },
        },
      },
    },
    {
      name: 'UNI.e Token',
      address: '0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580',
      symbol: 'UNI.e',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/avalanchec/assets/0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          },
        },
      },
    },
    {
      name: 'USDC Token',
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      symbol: 'USDC',
      decimals: 6,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/avalanchec/assets/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
      },
    },
    {
      name: 'Tether USD',
      address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
      symbol: 'USDT',
      decimals: 6,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      name: 'Wrapped AVAX',
      symbol: 'WAVAX',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/avalanchec/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo.png',
    },
    {
      name: 'Wrapped BTC',
      address: '0x50b7545627a5162F82A992c33b87aDc75187B218',
      symbol: 'WBTC',
      decimals: 8,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
      symbol: 'WETH',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      chainId: 43114,
      name: 'WOO Network',
      symbol: 'WOO',
      logoURI:
        'https://assets.coingecko.com/coins/images/12921/thumb/w2UiemF__400x400.jpg?1603670367',
      address: '0xaBC9547B534519fF73921b1FBA6E672b5f58D083',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
          },
        },
      },
    },
    {
      chainId: 43114,
      address: '0x9eAaC1B23d935365bD7b542Fe22cEEe2922f52dc',
      name: 'yearn finance',
      symbol: 'YFI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png?1598325330',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
          },
        },
      },
    },
    {
      name: '0x Protocol Token',
      address: '0x596fA47043f99A4e0F122243B841E55375cdE0d2',
      symbol: 'ZRX',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xE41d2489571d322189246DaFA5ebDe1F4699F498/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
      symbol: 'WETH',
      decimals: 18,
      chainId: 80001,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
    },
    {
      name: 'Wrapped Matic',
      address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
      symbol: 'WMATIC',
      decimals: 18,
      chainId: 80001,
      logoURI:
        'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?1624446912',
    },
    {
      chainId: 84531,
      address: '0xC6729C6cFc6B872acF641EB3EA628C9F038e5ABb',
      name: 'Alethea Artificial Liquid Intelligence',
      symbol: 'ALI',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/22062/thumb/alethea-logo-transparent-colored.png?1642748848',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B0b3a982b4634aC68dD83a4DBF02311cE324181',
          },
        },
      },
    },
    {
      chainId: 84531,
      address: '0x4fC531f8Ae7A7808E0dccCA08F1e3c7694582950',
      name: 'Coinbase Wrapped Staked ETH',
      symbol: 'cbETH',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/27008/large/cbeth.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
          },
        },
      },
    },
    {
      name: 'Compound',
      address: '0xA29b548056c3fD0f68BAd9d4829EC4E66f22f796',
      symbol: 'COMP',
      decimals: 18,
      chainId: 84531,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
          },
        },
      },
    },
    {
      name: 'Dai Stablecoin',
      address: '0x174956bDfbCEb6e53089297cce4fE2825E58d92C',
      symbol: 'DAI',
      decimals: 18,
      chainId: 84531,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        },
      },
    },
    {
      chainId: 84531,
      address: '0x121dAEb77cFbC6a9CfC691Da4F5E97c8Bd02518F',
      name: 'Prime',
      symbol: 'PRIME',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/29053/large/PRIMELOGOOO.png?1676976222',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xb23d80f5FefcDDaa212212F028021B41DEd428CF',
          },
        },
      },
    },
    {
      name: 'Synthetix Network Token',
      address: '0x6AF3cb766D6cd37449bfD321D961A61B0515c1BC',
      symbol: 'SNX',
      decimals: 18,
      chainId: 84531,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
          },
        },
      },
    },
    {
      chainId: 84531,
      address: '0x783349cd20f26CE12e747b1a17bC38D252c9e119',
      name: 'tBTC',
      symbol: 'tBTC',
      decimals: 18,
      logoURI:
        'https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x18084fbA666a33d37592fA2633fD49a74DD93a88/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
          },
        },
      },
    },
    {
      name: 'USDCoin',
      address: '0xF175520C52418dfE19C8098071a252da48Cd1C19',
      symbol: 'USDC',
      decimals: 6,
      chainId: 84531,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
      },
    },
    {
      chainId: 84531,
      name: 'Wrapped Ampleforth',
      symbol: 'WAMPL',
      logoURI:
        'https://assets.coingecko.com/coins/images/20825/thumb/photo_2021-11-25_02-05-11.jpg?1637811951',
      address: '0x395Ae52bB17aef68C2888d941736A71dC6d4e125',
      decimals: 18,
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xEDB171C18cE90B633DB442f2A6F72874093b49Ef',
          },
        },
      },
    },
    {
      name: 'Wrapped Ether',
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      decimals: 18,
      chainId: 84531,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
      extensions: {
        bridgeInfo: {
          '1': {
            tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          },
        },
      },
    },
    {
      name: 'Uniswap',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      decimals: 18,
      chainId: 11155111,
      logoURI: 'ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg',
    },
    {
      name: 'Wrapped Ether',
      address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      symbol: 'WETH',
      decimals: 18,
      chainId: 11155111,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
    },
    {
      name: 'Wrapped Ether',
      address: '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
      symbol: 'WETH',
      decimals: 18,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
    },
    {
      name: 'Wrapped liquid staked Ether 2.0',
      address: '0x6C76971f98945AE98dD7d4DFcA8711ebea946eA6',
      symbol: 'wstETH',
      decimals: 18,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/18834/standard/wstETH.png?1696518295',
    },
    {
      name: 'Savings xDAI',
      address: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
      symbol: 'sDAI',
      decimals: 18,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/32254/standard/sdai.png?1697015278',
    },
    {
      name: 'Gnosis Token on XDai',
      address: '0x9c58bacc331c9aa871afd802db6379a98e80cedb',
      symbol: 'GNO',
      decimals: 18,
      chainId: 100,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6810e776880C02933D47DB1b9fc05908e5386b96/logo.png',
    },
    {
      name: 'Monerium EUR emoney',
      address: '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
      symbol: 'EURe',
      decimals: 18,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/54303/standard/eure.jpg?1739167959',
    },

    {
      name: 'Monerium EUR emoney',
      address: '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
      symbol: 'EURe',
      decimals: 18,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/54303/standard/eure.jpg?1739167959',
    },
    {
      name: 'Bridged USDC',
      address: '0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0',
      symbol: 'USDC.e',
      decimals: 6,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
    },
    {
      name: 'USDC (old)',
      address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
      symbol: 'USDC',
      decimals: 6,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
    },
    {
      name: 'Wrapped xDAI',
      address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
      symbol: 'WXDAI',
      decimals: 18,
      chainId: 100,
      logoURI: 'https://gnosisscan.io/token/images/wrappedxdai_32.png', // not in coingecko
    },
    {
      name: 'USDT',
      address: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
      symbol: 'USDT',
      decimals: 6,
      chainId: 100,
      logoURI:
        'https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png?1598003707',
    },
    {
      name: 'Ethereum',
      address: '0xc558dbdd856501fcd9aaf1e62eae57a9f0629a3c',
      symbol: 'ETH',
      decimals: 18,
      chainId: 11155111,
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
      chainId: 11155111,
      logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
    },
    {
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
      address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
      chainId: 11155111,
      logoURI:
        'https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734',
    },
    {
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
      chainId: 11155111,
      logoURI:
        'https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png?1598003707',
    },
    {
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
      address: '0x29f2D40B0605204364af54EC677bD022dA425d03',
      chainId: 11155111,
      logoURI:
        'https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744',
    },
    {
      name: 'Aave',
      symbol: 'AAVE',
      decimals: 18,
      address: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
      chainId: 11155111,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
    },
    {
      name: 'Chainlink',
      symbol: 'LINK',
      decimals: 18,
      address: '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5',
      chainId: 11155111,
      logoURI:
        'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700',
    },
    {
      name: 'Gho Token',
      address: '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f',
      symbol: 'GHO',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/30663/standard/gho-token-logo.png?1720517092',
    },
    {
      name: 'Gho Token',
      address: '0x7dff72693f6a4149b17e7c6314655f6a9f7c8b33',
      symbol: 'GHO',
      decimals: 18,
      chainId: 42161,
      logoURI:
        'https://assets.coingecko.com/coins/images/30663/standard/gho-token-logo.png?1720517092',
    },
    {
      name: 'Gho Token',
      address: '0xfc421ad3c883bf9e7c4f42de845c4e4405799e73',
      symbol: 'GHO',
      decimals: 18,
      chainId: 43114,
      logoURI:
        'https://assets.coingecko.com/coins/images/30663/standard/gho-token-logo.png?1720517092',
    },
    {
      name: 'Gho Token',
      address: '0x6bb7a212910682dcfdbd5bcbb3e28fb4e8da10ee',
      symbol: 'GHO',
      decimals: 18,
      chainId: 8453,
      logoURI:
        'https://assets.coingecko.com/coins/images/30663/standard/gho-token-logo.png?1720517092',
    },
    {
      name: 'Aave',
      address: '0x63706e401c06ac8513145b7687A14804d17f814b',
      symbol: 'AAVE',
      decimals: 18,
      chainId: 8453,
      logoURI:
        'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png?1720472354',
    },
    {
      name: 'stk GHO',
      address: '0x1a88Df1cFe15Af22B3c4c783D4e6F7F9e0C1885d',
      symbol: 'stkGHO',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/34849/standard/staked-gho.png?1736975912',
    },
    {
      name: 'USDS Stablecoin',
      address: '0xdc035d45d973e3ec169d2276ddab16f1e407384f',
      symbol: 'USDS',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/39926/standard/usds.webp?1726666683',
    },
    {
      name: 'Savings Dai',
      address: '0x83f20f44975d03b1b09e64809b757c47f942beea',
      symbol: 'SDAI',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/32254/standard/sdai.png?1697015278',
    },
    // Sonic
    {
      name: 'USDC',
      address: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
      symbol: 'USDC',
      decimals: 6,
      chainId: 146,
      logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
    },
    {
      name: 'Wrapped Sonic',
      address: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',
      symbol: 'wS',
      decimals: 18,
      chainId: 146,
      logoURI:
        'https://assets.coingecko.com/coins/images/52857/standard/wrapped_sonic.png?1734536585',
    },
    {
      name: 'Wrapped ETH',
      address: '0x50c42dEAcD8Fc9773493ED674b675bE577f2634b',
      symbol: 'WETH',
      decimals: 18,
      chainId: 146,
      logoURI:
        'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1696503332',
    },
    {
      name: 'Beets Staked Sonic',
      address: '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955',
      symbol: 'stS',
      decimals: 18,
      chainId: 146,
      logoURI:
        'https://assets.coingecko.com/coins/images/52937/standard/token-beets-staked-sonic.png?1734712659',
    },
    {
      name: 'RLUSD',
      address: '0x8292bb45bf1ee4d140127049757c2e0ff06317ed',
      symbol: 'RLUSD',
      decimals: 18,
      chainId: 1,
      logoURI:
        'https://assets.coingecko.com/coins/images/39651/standard/RLUSD_200x200_%281%29.png?1727376633',
    },
  ],
};

export const COMMON_SWAPS = [
  'ETH',
  'DAI',
  'GHO',
  'USDC',
  'USDT',
  'WBTC',
  'WETH',
  'AAVE',
  'DAI.e',
  'USDC.e',
  'USDT.e',
  'EURC',
];

export const findTokenSymbol = (address: string, chainId: number) => {
  const token = TOKEN_LIST.tokens.find(
    (token) =>
      token.address.toLowerCase() === address.toLowerCase() &&
      token.chainId === chainId
  );
  return token?.symbol;
};
