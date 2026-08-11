import { useDesktopProfileStore } from '@/ui/state/desktopProfile';
import { CHAINS_ENUM } from '@/types/chain';

describe('desktop profile store', () => {
  beforeEach(() => {
    useDesktopProfileStore.setState({
      chain: undefined,
      activeTab: 'tokens',
      addAddress: {
        visible: false,
        importType: '',
      },
    });
  });

  test('uses the existing desktop profile defaults', () => {
    expect(useDesktopProfileStore.getState()).toMatchObject({
      chain: undefined,
      activeTab: 'tokens',
      addAddress: {
        visible: false,
        importType: '',
      },
    });
  });

  test('updates desktop-only state through domain actions', () => {
    const store = useDesktopProfileStore.getState();

    store.setChain(CHAINS_ENUM.ARBITRUM);
    store.setActiveTab('transactions');
    store.setAddAddress({
      visible: true,
      importType: 'import-key-or-seed',
      state: { source: 'desktop' },
    });

    expect(useDesktopProfileStore.getState()).toMatchObject({
      chain: CHAINS_ENUM.ARBITRUM,
      activeTab: 'transactions',
      addAddress: {
        visible: true,
        importType: 'import-key-or-seed',
        state: { source: 'desktop' },
      },
    });
  });
});
