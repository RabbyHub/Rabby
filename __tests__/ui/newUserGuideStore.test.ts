import { useNewUserGuideStore } from '@/ui/state/newUserGuide';

describe('new user guide store', () => {
  beforeEach(() => {
    useNewUserGuideStore.setState({
      data: {
        password: '',
        seedPhrase: '',
        privateKey: '',
        gnosis: undefined,
        passphrase: '',
      },
    });
  });

  test('uses the existing onboarding defaults', () => {
    expect(useNewUserGuideStore.getState().data).toEqual({
      password: '',
      seedPhrase: '',
      privateKey: '',
      gnosis: undefined,
      passphrase: '',
    });
  });

  test('merges partial onboarding state in memory', () => {
    const { setStore } = useNewUserGuideStore.getState();

    setStore({ password: 'password' });
    setStore({ seedPhrase: 'test seed phrase', passphrase: 'passphrase' });

    expect(useNewUserGuideStore.getState().data).toMatchObject({
      password: 'password',
      seedPhrase: 'test seed phrase',
      passphrase: 'passphrase',
    });
  });

  test('clears every sensitive onboarding field', () => {
    const store = useNewUserGuideStore.getState();
    store.setStore({
      password: 'password',
      seedPhrase: 'test seed phrase',
      privateKey: 'private key',
      passphrase: 'passphrase',
      clearKeyringId: 1,
      gnosis: {
        address: '0x123',
        chainList: [],
      },
    });

    useNewUserGuideStore.getState().clearStore();

    expect(useNewUserGuideStore.getState().data).toEqual({
      password: undefined,
      seedPhrase: undefined,
      privateKey: undefined,
      gnosis: undefined,
      passphrase: undefined,
      clearKeyringId: undefined,
    });
  });
});
