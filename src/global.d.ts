import { Wallet } from 'background/controller/wallet';

declare global {
  interface Window {
    wallet: Wallet;
    ethereum: any;
  }
}

// export enum ADDRESS_TYPE {
//   MENMONIC,
//   HARDWARE,
//   WATCH,
//   PRIVATE_KEY,
// }

// export enum HARDWARE_WALLET_BRAND {
//   ONEKEY,
//   TREZOR,
//   LEDGER,
// }

// export enum HARDWARE_WALLET_SDK_TYPE {
//   TREZOR,
//   LEDGER,
// }

// export enum CHAIN {
//   ETH,
//   BSC,
//   DAI,
//   HECO,
//   POLYGON,
// }

// interface Account {
//   type: ADDRESS_TYPE;
//   address: string;
//   sdkType: HARDWARE_WALLET_SDK_TYPE;
//   keyring: Keyring;
//   brand: HARDWARE_WALLET_BRAND;
//   chain: CHAIN;
// }

// interface Chain {
//   type: CHAIN;
//   id: string;
//   enabled: boolean;
//   logo: string;
// }

// interface ConnectedSite {
//   origin: string;
//   name: string;
//   logo: string;
//   defaultChain: Chain;
// }
