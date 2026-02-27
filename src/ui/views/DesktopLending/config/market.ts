import { ChainId } from '@aave/contract-helpers';
import {
  AaveV3Arbitrum,
  AaveV3Avalanche,
  AaveV3Base,
  AaveV3BNB,
  AaveV3Celo,
  AaveV3Ethereum,
  AaveV3EthereumLido,
  AaveV3Gnosis,
  AaveV3InkWhitelabel,
  AaveV3Linea,
  AaveV3Metis,
  AaveV3Optimism,
  AaveV3Plasma,
  AaveV3Polygon,
  AaveV3Scroll,
  AaveV3Soneium,
  AaveV3Sonic,
  AaveV3ZkSync,
} from '@bgd-labs/aave-address-book';
import { ReactNode } from 'react';

export type MarketDataType = {
  v3?: boolean;
  marketTitle: string;
  market: CustomMarket;
  // the network the market operates on
  chainId: ChainId;
  enabledFeatures?: {
    liquiditySwap?: boolean;
    staking?: boolean;
    governance?: boolean;
    faucet?: boolean;
    collateralRepay?: boolean;
    incentives?: boolean;
    permissions?: boolean;
    debtSwitch?: boolean;
    withdrawAndSwitch?: boolean;
    switch?: boolean;
    limit?: boolean;
  };
  permitDisabled?: boolean; // intended to be used for testnets
  isFork?: boolean;
  permissionComponent?: ReactNode;
  logo?: string;
  externalUrl?: string; // URL for external markets like Aptos
  addresses: {
    LENDING_POOL_ADDRESS_PROVIDER: string;
    LENDING_POOL: string;
    WETH_GATEWAY?: string;
    SWAP_COLLATERAL_ADAPTER?: string;
    REPAY_WITH_COLLATERAL_ADAPTER?: string;
    DEBT_SWITCH_ADAPTER?: string;
    WITHDRAW_SWITCH_ADAPTER?: string;
    FAUCET?: string;
    PERMISSION_MANAGER?: string;
    WALLET_BALANCE_PROVIDER: string;
    L2_ENCODER?: string;
    UI_POOL_DATA_PROVIDER: string;
    UI_INCENTIVE_DATA_PROVIDER?: string;
    COLLECTOR?: string;
    V3_MIGRATOR?: string;
    GHO_TOKEN_ADDRESS?: string;
  };
};
export enum CustomMarket {
  // v3 mainnets, only v3
  proto_mainnet_v3 = 'proto_mainnet_v3',
  proto_optimism_v3 = 'proto_optimism_v3',
  proto_avalanche_v3 = 'proto_avalanche_v3',
  proto_polygon_v3 = 'proto_polygon_v3',
  proto_arbitrum_v3 = 'proto_arbitrum_v3',
  proto_metis_v3 = 'proto_metis_v3',
  proto_base_v3 = 'proto_base_v3',
  proto_gnosis_v3 = 'proto_gnosis_v3',
  proto_bnb_v3 = 'proto_bnb_v3',
  proto_scroll_v3 = 'proto_scroll_v3',
  proto_lido_v3 = 'proto_lido_v3',
  proto_zksync_v3 = 'proto_zksync_v3',
  proto_linea_v3 = 'proto_linea_v3',
  proto_sonic_v3 = 'proto_sonic_v3',
  proto_celo_v3 = 'proto_celo_v3',
  proto_soneium_v3 = 'proto_soneium_v3',
  proto_horizon_v3 = 'proto_horizon_v3',
  proto_plasma_v3 = 'proto_plasma_v3',
  proto_ink_v3 = 'proto_ink_v3',
}

export const marketsData: {
  [key in keyof typeof CustomMarket]: MarketDataType;
} = {
  [CustomMarket.proto_mainnet_v3]: {
    marketTitle: 'Core',
    market: CustomMarket.proto_mainnet_v3,
    chainId: ChainId.mainnet,
    v3: true,
    enabledFeatures: {
      governance: true,
      staking: true,
      liquiditySwap: true,
      collateralRepay: true,
      incentives: true,
      withdrawAndSwitch: true,
      debtSwitch: true,
      switch: true,
      limit: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Ethereum.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Ethereum.POOL,
      WETH_GATEWAY: AaveV3Ethereum.WETH_GATEWAY,
      REPAY_WITH_COLLATERAL_ADAPTER:
        AaveV3Ethereum.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER: AaveV3Ethereum.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: AaveV3Ethereum.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Ethereum.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Ethereum.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Ethereum.COLLECTOR,
      GHO_TOKEN_ADDRESS: AaveV3Ethereum.ASSETS.GHO.UNDERLYING,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Ethereum.WITHDRAW_SWAP_ADAPTER,
      DEBT_SWITCH_ADAPTER: AaveV3Ethereum.DEBT_SWAP_ADAPTER,
    },
  },
  [CustomMarket.proto_lido_v3]: {
    marketTitle: 'Prime',
    market: CustomMarket.proto_lido_v3,
    chainId: ChainId.mainnet,
    v3: true,
    logo: '/icons/markets/lido.svg',
    enabledFeatures: {
      governance: true,
      staking: true,
      liquiditySwap: true,
      collateralRepay: true,
      incentives: true,
      withdrawAndSwitch: true,
      debtSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3EthereumLido.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3EthereumLido.POOL,
      WETH_GATEWAY: AaveV3EthereumLido.WETH_GATEWAY,
      REPAY_WITH_COLLATERAL_ADAPTER:
        AaveV3EthereumLido.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER: AaveV3EthereumLido.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: AaveV3EthereumLido.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3EthereumLido.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3EthereumLido.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Ethereum.COLLECTOR,
      WITHDRAW_SWITCH_ADAPTER: AaveV3EthereumLido.WITHDRAW_SWAP_ADAPTER,
      DEBT_SWITCH_ADAPTER: AaveV3EthereumLido.DEBT_SWAP_ADAPTER,
    },
  },
  // v3
  [CustomMarket.proto_base_v3]: {
    marketTitle: 'Base',
    market: CustomMarket.proto_base_v3,
    v3: true,
    chainId: ChainId.base,
    enabledFeatures: {
      incentives: true,
      liquiditySwap: true,
      withdrawAndSwitch: true,
      collateralRepay: true,
      debtSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Base.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Base.POOL,
      WETH_GATEWAY: AaveV3Base.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Base.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Base.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Base.UI_INCENTIVE_DATA_PROVIDER,
      L2_ENCODER: AaveV3Base.L2_ENCODER,
      COLLECTOR: AaveV3Base.COLLECTOR,
      REPAY_WITH_COLLATERAL_ADAPTER: AaveV3Base.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER: AaveV3Base.SWAP_COLLATERAL_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Base.WITHDRAW_SWAP_ADAPTER,
      DEBT_SWITCH_ADAPTER: AaveV3Base.DEBT_SWAP_ADAPTER,
      GHO_TOKEN_ADDRESS: '0x6bb7a212910682dcfdbd5bcbb3e28fb4e8da10ee',
    },
  },
  [CustomMarket.proto_arbitrum_v3]: {
    marketTitle: 'Arbitrum',
    market: CustomMarket.proto_arbitrum_v3,
    v3: true,
    chainId: ChainId.arbitrum_one,
    enabledFeatures: {
      incentives: true,
      liquiditySwap: true,
      collateralRepay: true,
      debtSwitch: true,
      withdrawAndSwitch: true,
      switch: true,
      limit: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Arbitrum.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Arbitrum.POOL,
      WETH_GATEWAY: AaveV3Arbitrum.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Arbitrum.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Arbitrum.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Arbitrum.UI_INCENTIVE_DATA_PROVIDER,
      L2_ENCODER: AaveV3Arbitrum.L2_ENCODER,
      COLLECTOR: AaveV3Arbitrum.COLLECTOR,
      SWAP_COLLATERAL_ADAPTER: AaveV3Arbitrum.SWAP_COLLATERAL_ADAPTER,
      REPAY_WITH_COLLATERAL_ADAPTER:
        AaveV3Arbitrum.REPAY_WITH_COLLATERAL_ADAPTER,
      DEBT_SWITCH_ADAPTER: AaveV3Arbitrum.DEBT_SWAP_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Arbitrum.WITHDRAW_SWAP_ADAPTER,
      GHO_TOKEN_ADDRESS: AaveV3Arbitrum.ASSETS.GHO.UNDERLYING,
    },
  },
  [CustomMarket.proto_avalanche_v3]: {
    marketTitle: 'Avalanche',
    market: CustomMarket.proto_avalanche_v3,
    v3: true,
    chainId: ChainId.avalanche,
    enabledFeatures: {
      liquiditySwap: true,
      incentives: true,
      collateralRepay: true,
      debtSwitch: true,
      withdrawAndSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Avalanche.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Avalanche.POOL,
      WETH_GATEWAY: AaveV3Avalanche.WETH_GATEWAY,
      REPAY_WITH_COLLATERAL_ADAPTER:
        AaveV3Avalanche.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER: AaveV3Avalanche.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: AaveV3Avalanche.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Avalanche.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Avalanche.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Avalanche.COLLECTOR,
      DEBT_SWITCH_ADAPTER: AaveV3Avalanche.DEBT_SWAP_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Avalanche.WITHDRAW_SWAP_ADAPTER,
      GHO_TOKEN_ADDRESS: '0xfc421ad3c883bf9e7c4f42de845c4e4405799e73',
    },
  },
  [CustomMarket.proto_linea_v3]: {
    marketTitle: 'Linea',
    market: CustomMarket.proto_linea_v3,
    chainId: ChainId.linea,
    logo: '/icons/markets/linea.svg',
    v3: true,
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Linea.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Linea.POOL,
      WETH_GATEWAY: AaveV3Linea.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Linea.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Linea.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Linea.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Linea.COLLECTOR,
    },
  },
  [CustomMarket.proto_sonic_v3]: {
    marketTitle: 'Sonic',
    market: CustomMarket.proto_sonic_v3,
    chainId: ChainId.sonic,
    v3: true,
    enabledFeatures: {
      collateralRepay: true,
      liquiditySwap: true,
      debtSwitch: true,
      withdrawAndSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Sonic.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Sonic.POOL,
      WETH_GATEWAY: AaveV3Sonic.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Sonic.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Sonic.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Sonic.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Sonic.COLLECTOR,
      SWAP_COLLATERAL_ADAPTER: AaveV3Sonic.SWAP_COLLATERAL_ADAPTER,
      REPAY_WITH_COLLATERAL_ADAPTER: AaveV3Sonic.REPAY_WITH_COLLATERAL_ADAPTER,
      DEBT_SWITCH_ADAPTER: AaveV3Sonic.DEBT_SWAP_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Sonic.WITHDRAW_SWAP_ADAPTER,
    },
  },
  [CustomMarket.proto_optimism_v3]: {
    marketTitle: 'OP',
    market: CustomMarket.proto_optimism_v3,
    v3: true,
    chainId: ChainId.optimism,
    enabledFeatures: {
      incentives: true,
      collateralRepay: true,
      liquiditySwap: true,
      debtSwitch: true,
      withdrawAndSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Optimism.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Optimism.POOL,
      WETH_GATEWAY: AaveV3Optimism.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Optimism.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Optimism.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Optimism.UI_INCENTIVE_DATA_PROVIDER,
      L2_ENCODER: AaveV3Optimism.L2_ENCODER,
      COLLECTOR: AaveV3Optimism.COLLECTOR,
      SWAP_COLLATERAL_ADAPTER: AaveV3Optimism.SWAP_COLLATERAL_ADAPTER,
      REPAY_WITH_COLLATERAL_ADAPTER:
        AaveV3Optimism.REPAY_WITH_COLLATERAL_ADAPTER,
      DEBT_SWITCH_ADAPTER: AaveV3Optimism.DEBT_SWAP_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Optimism.WITHDRAW_SWAP_ADAPTER,
    },
  },
  [CustomMarket.proto_horizon_v3]: {
    marketTitle: 'Horizon RWA',
    market: CustomMarket.proto_horizon_v3,
    chainId: ChainId.mainnet,
    v3: true,
    logo: '/icons/markets/horizon.svg',
    // subgraphUrl: `https://gateway-arbitrum.network.thegraph.com/api/${apiKey}/subgraphs/id/5vxMbXRhG1oQr55MWC5j6qg78waWujx1wjeuEWDA6j3`,
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER:
        '0x5D39E06b825C1F2B80bf2756a73e28eFAA128ba0',
      LENDING_POOL: '0xAe05Cd22df81871bc7cC2a04BeCfb516bFe332C8',
      WETH_GATEWAY: '0x973195fB8F67F5B0afe7beDB2A02cec829d89991',
      // REPAY_WITH_COLLATERAL_ADAPTER: AaveV3EthereumLido.REPAY_WITH_COLLATERAL_ADAPTER,
      // SWAP_COLLATERAL_ADAPTER: AaveV3EthereumLido.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: '0xd8F7829ceB2692C90e418e0963b5Cbcbafc260Bd',
      UI_POOL_DATA_PROVIDER: '0x2581d1f2Ce3860b651bF84AF416e7d28d9500D7F',
      UI_INCENTIVE_DATA_PROVIDER: '0xC5E1717BEafC680E0148DD561591410b69650a5F',
      COLLECTOR: '0x8b8d44751a933f190dde25A69E8cC6F9101b5435',
      // WITHDRAW_SWITCH_ADAPTER: AaveV3EthereumLido.WITHDRAW_SWAP_ADAPTER,
      // DEBT_SWITCH_ADAPTER: AaveV3EthereumLido.DEBT_SWAP_ADAPTER,
    },
  },
  [CustomMarket.proto_plasma_v3]: {
    marketTitle: 'Plasma',
    market: CustomMarket.proto_plasma_v3,
    chainId: 9745 as ChainId,
    v3: true,
    logo: '/icons/networks/plasma.svg',
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Plasma.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Plasma.POOL,
      WETH_GATEWAY: AaveV3Plasma.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Plasma.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: '0xc851e6147dcE6A469CC33BE3121b6B2D4CaD2763', //AaveV3Plasma.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Plasma.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Plasma.COLLECTOR,
    },
  },
  [CustomMarket.proto_polygon_v3]: {
    marketTitle: 'Polygon',
    market: CustomMarket.proto_polygon_v3,
    chainId: ChainId.polygon,
    v3: true,
    enabledFeatures: {
      liquiditySwap: true,
      incentives: true,
      collateralRepay: true,
      debtSwitch: true,
      withdrawAndSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Polygon.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Polygon.POOL,
      WETH_GATEWAY: AaveV3Polygon.WETH_GATEWAY,
      REPAY_WITH_COLLATERAL_ADAPTER:
        AaveV3Polygon.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER: AaveV3Polygon.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: AaveV3Polygon.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Polygon.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Polygon.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Polygon.COLLECTOR,
      DEBT_SWITCH_ADAPTER: AaveV3Polygon.DEBT_SWAP_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Polygon.WITHDRAW_SWAP_ADAPTER,
    },
  },

  [CustomMarket.proto_ink_v3]: {
    marketTitle: 'Ink',
    market: CustomMarket.proto_ink_v3,
    chainId: 57073 as ChainId,
    v3: true,
    logo: '/icons/networks/ink.svg',
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER:
        AaveV3InkWhitelabel.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3InkWhitelabel.POOL,
      WETH_GATEWAY: AaveV3InkWhitelabel.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3InkWhitelabel.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: '0xc851e6147dcE6A469CC33BE3121b6B2D4CaD2763', // custom as doesnt work utils
      UI_INCENTIVE_DATA_PROVIDER:
        AaveV3InkWhitelabel.UI_INCENTIVE_DATA_PROVIDER,
      // COLLECTOR: AaveV3InkWhitelabel.COLLECTOR,
    },
  },

  [CustomMarket.proto_gnosis_v3]: {
    marketTitle: 'Gnosis',
    market: CustomMarket.proto_gnosis_v3,
    chainId: ChainId.xdai,
    v3: true,
    enabledFeatures: {
      liquiditySwap: true,
      collateralRepay: true,
      debtSwitch: true,
      withdrawAndSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Gnosis.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Gnosis.POOL,
      WETH_GATEWAY: AaveV3Gnosis.WETH_GATEWAY,
      REPAY_WITH_COLLATERAL_ADAPTER: AaveV3Gnosis.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER: AaveV3Gnosis.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: AaveV3Gnosis.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Gnosis.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Gnosis.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Gnosis.COLLECTOR,
      DEBT_SWITCH_ADAPTER: AaveV3Gnosis.DEBT_SWAP_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3Gnosis.WITHDRAW_SWAP_ADAPTER,
      GHO_TOKEN_ADDRESS: '0xfc421ad3c883bf9e7c4f42de845c4e4405799e73',
    },
  },
  [CustomMarket.proto_bnb_v3]: {
    marketTitle: 'BNB Chain',
    market: CustomMarket.proto_bnb_v3,
    chainId: ChainId.bnb,
    v3: true,
    enabledFeatures: {
      liquiditySwap: true,
      collateralRepay: true,
      debtSwitch: true,
      withdrawAndSwitch: true,
      switch: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3BNB.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3BNB.POOL,
      WETH_GATEWAY: AaveV3BNB.WETH_GATEWAY,
      REPAY_WITH_COLLATERAL_ADAPTER: AaveV3BNB.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER: AaveV3BNB.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: AaveV3BNB.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3BNB.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3BNB.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3BNB.COLLECTOR,
      DEBT_SWITCH_ADAPTER: AaveV3BNB.DEBT_SWAP_ADAPTER,
      WITHDRAW_SWITCH_ADAPTER: AaveV3BNB.WITHDRAW_SWAP_ADAPTER,
    },
  },
  [CustomMarket.proto_scroll_v3]: {
    marketTitle: 'Scroll',
    market: CustomMarket.proto_scroll_v3,
    chainId: ChainId.scroll,
    v3: true,
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Scroll.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Scroll.POOL,
      WETH_GATEWAY: AaveV3Scroll.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Scroll.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Scroll.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Scroll.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Scroll.COLLECTOR,
    },
  },
  [CustomMarket.proto_zksync_v3]: {
    marketTitle: 'ZKsync',
    market: CustomMarket.proto_zksync_v3,
    chainId: ChainId.zksync,
    v3: true,
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3ZkSync.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3ZkSync.POOL,
      WETH_GATEWAY: AaveV3ZkSync.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3ZkSync.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3ZkSync.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3ZkSync.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3ZkSync.COLLECTOR,
    },
  },
  [CustomMarket.proto_celo_v3]: {
    marketTitle: 'Celo',
    market: CustomMarket.proto_celo_v3,
    chainId: ChainId.celo,
    v3: true,
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Celo.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Celo.POOL,
      WALLET_BALANCE_PROVIDER: AaveV3Celo.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Celo.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Celo.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Celo.COLLECTOR,
    },
  },
  [CustomMarket.proto_soneium_v3]: {
    marketTitle: 'Soneium',
    market: CustomMarket.proto_soneium_v3,
    chainId: ChainId.soneium,
    v3: true,
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Soneium.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Soneium.POOL,
      WETH_GATEWAY: AaveV3Soneium.WETH_GATEWAY,
      WALLET_BALANCE_PROVIDER: AaveV3Soneium.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Soneium.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Soneium.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Soneium.COLLECTOR,
    },
  },
  [CustomMarket.proto_metis_v3]: {
    marketTitle: 'Metis',
    market: CustomMarket.proto_metis_v3,
    chainId: ChainId.metis_andromeda,
    v3: true,
    enabledFeatures: {
      incentives: true,
    },
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: AaveV3Metis.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL: AaveV3Metis.POOL,
      WETH_GATEWAY: '0x0', // not applicable for Metis
      WALLET_BALANCE_PROVIDER: AaveV3Metis.WALLET_BALANCE_PROVIDER,
      UI_POOL_DATA_PROVIDER: AaveV3Metis.UI_POOL_DATA_PROVIDER,
      UI_INCENTIVE_DATA_PROVIDER: AaveV3Metis.UI_INCENTIVE_DATA_PROVIDER,
      COLLECTOR: AaveV3Metis.COLLECTOR,
    },
  },
} as const;

export const findByChainId = (chainId: ChainId) => {
  return Object.values(marketsData).find(
    (market) => market.chainId === chainId
  );
};

export const getMarketLogo = (market: CustomMarket) => {
  if (market === CustomMarket.proto_lido_v3) {
    return {
      uri:
        'https://static-assets.rabby.io/files/a6dc7573-a15d-4cce-9993-ee9e07204f51.png',
    };
  }
  if (market === CustomMarket.proto_horizon_v3) {
    return {
      uri:
        'https://static-assets.rabby.io/files/f9ab51bf-30c5-4b26-9ba5-6d730369a945.png',
    };
  }
  return undefined;
};
