jest.mock('@/ui/hooks/useEnterPassphraseModal', () => ({
  useEnterPassphraseModal: () => jest.fn(),
}));

jest.mock('@/ui/store', () => ({
  useRabbyDispatch: () => ({
    account: {
      getCurrentAccountAsync: jest.fn(),
    },
  }),
}));

jest.mock('@/ui/utils', () => ({
  useWallet: () => ({}),
}));

jest.mock('ahooks', () => ({
  useMemoizedFn: (fn: unknown) => fn,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: {
      pathname: '/mock-path',
    },
    push: jest.fn(),
  }),
}));

import {
  ADDRESS_BACKUP_MNEMONICS_PATH,
  getBackupSeedPhrasePageRoute,
  getCreateAddressSuccessSecondaryAction,
} from '@/ui/views/AddAddress/useCreateAddress';

describe('getCreateAddressSuccessSecondaryAction', () => {
  it('returns backup action for created seed phrase success page', () => {
    expect(
      getCreateAddressSuccessSecondaryAction({
        address: '0xaddress',
        publicKey: '0xpublicKey',
        primaryAction: 'done',
        seedPhrase: 'test seed phrase',
      })
    ).toEqual({
      kind: 'backup',
      labelKey: 'page.newUserImport.successful.backupSeedPhrase',
    });
  });

  it('returns null when success page is in open wallet mode', () => {
    expect(
      getCreateAddressSuccessSecondaryAction({
        publicKey: '0xpublicKey',
        primaryAction: 'open-wallet',
      })
    ).toBeNull();
  });

  it('returns add more action for existing seed phrase success page', () => {
    expect(
      getCreateAddressSuccessSecondaryAction({
        publicKey: '0xpublicKey',
        primaryAction: 'done',
      })
    ).toEqual({
      kind: 'add-more',
      labelKey: 'page.newAddress.addMoreAddressesFromThisSeedPhrase',
    });
  });
});

describe('getBackupSeedPhrasePageRoute', () => {
  const routeState = {
    address: '0xaddress',
    data: 'test seed phrase',
    redirectTo: '/dashboard',
  };

  it('returns normal backup page route for web flow', () => {
    expect(
      getBackupSeedPhrasePageRoute({
        currentPathname: '/add-address/create-address-success',
        isInModalFlow: false,
        state: routeState,
      })
    ).toEqual({
      pathname: ADDRESS_BACKUP_MNEMONICS_PATH,
      state: routeState,
    });
  });

  it('returns desktop backup modal route for desktop modal flow', () => {
    expect(
      getBackupSeedPhrasePageRoute({
        currentPathname: '/desktop/profile',
        isInModalFlow: true,
        state: routeState,
      })
    ).toEqual({
      pathname: '/desktop/profile',
      search: '?action=address-backup&backupType=mneonics',
      state: {
        ...routeState,
        redirectTo: '/desktop/profile',
      },
    });
  });
});
