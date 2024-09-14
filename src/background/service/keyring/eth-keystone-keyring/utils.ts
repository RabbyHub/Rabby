import {
  CryptoAccount,
  CryptoOutput,
  CryptoHDKey,
  CryptoKeypath,
  CryptoCoinInfo,
  PathComponent,
} from '@keystonehq/bc-ur-registry-eth';

export enum KeystoneHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}

export const pathBase = 'm';

export const HDPATH_PLACEHOLDER = 'x';

export const ETH_PURPOSE = 44;

export const ETH_COIN_TYPE = 60;

export const LEDGER_LIVE_LIMIT = 10;

export type GetAddressResultType = {
  address: string;
  publicKey: string;
  mfp: string;
  chainCode?: string;
};

export const KEY_RING_TYPE = {
  [KeystoneHDPathType.BIP44]: 'account.standard',
  [KeystoneHDPathType.Legacy]: 'account.ledger_legacy',
  [KeystoneHDPathType.LedgerLive]: 'account.ledger_live',
};

export const keystoneAccountTypeModel = [
  {
    keyringType: KEY_RING_TYPE[KeystoneHDPathType.BIP44],
    type: KeystoneHDPathType.BIP44,
    hdpath: "m/44'/60'/0'",
  },
  {
    keyringType: KEY_RING_TYPE[KeystoneHDPathType.LedgerLive],
    type: KeystoneHDPathType.LedgerLive,
    hdpath: `m/44'/60'/${HDPATH_PLACEHOLDER}'/0/0`,
  },
  {
    keyringType: KEY_RING_TYPE[KeystoneHDPathType.Legacy],
    type: KeystoneHDPathType.Legacy,
    hdpath: "m/44'/60'/0'",
  },
];

const calcLedgerLivePathComponents = (accountIndex: number) => {
  return [
    new PathComponent({
      index: ETH_PURPOSE,
      hardened: true,
    }),
    new PathComponent({
      index: ETH_COIN_TYPE,
      hardened: true,
    }),
    new PathComponent({
      index: accountIndex,
      hardened: true,
    }),
    new PathComponent({
      index: 0,
      hardened: false,
    }),
    new PathComponent({
      index: 0,
      hardened: false,
    }),
  ];
};

export const createCryptoHDKeyFromResult = (
  result: GetAddressResultType,
  type: KeystoneHDPathType = KeystoneHDPathType.BIP44,
  accountIndex = 0
): CryptoHDKey => {
  return new CryptoHDKey({
    isMaster: false,
    isPrivateKey: false,
    key: Buffer.from(result.publicKey, 'hex'),
    chainCode: Buffer.from(result.chainCode!, 'hex'),
    useInfo: new CryptoCoinInfo(60 as any, 0),
    origin: new CryptoKeypath(
      type === KeystoneHDPathType.LedgerLive
        ? calcLedgerLivePathComponents(accountIndex)
        : [
            new PathComponent({
              index: ETH_PURPOSE,
              hardened: true,
            }),
            new PathComponent({
              index: ETH_COIN_TYPE,
              hardened: true,
            }),
            new PathComponent({
              index: 0,
              hardened: true,
            }),
          ],
      Buffer.from(result.mfp, 'hex')
    ),
    children:
      type === KeystoneHDPathType.LedgerLive
        ? undefined
        : new CryptoKeypath(
            type === KeystoneHDPathType.Legacy
              ? [
                  new PathComponent({
                    hardened: false,
                  }),
                ]
              : [
                  new PathComponent({
                    index: 0,
                    hardened: false,
                  }),
                  new PathComponent({
                    hardened: false,
                  }),
                ].filter((item) => !!item),
            Buffer.from(result.mfp, 'hex')
          ),
    parentFingerprint: Buffer.from(result.mfp, 'hex'),
    name: 'Keystone',
    note: KEY_RING_TYPE[type],
  });
};

export const createCryptoAccountFromResults = (
  results: GetAddressResultType[],
  type: KeystoneHDPathType = KeystoneHDPathType.BIP44,
  mfp: Buffer
): CryptoAccount => {
  return new CryptoAccount(
    mfp,
    results.map((result, index) => {
      return new CryptoOutput(
        [],
        createCryptoHDKeyFromResult(result, type, index)
      );
    })
  );
};
