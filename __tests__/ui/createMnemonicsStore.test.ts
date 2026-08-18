import {
  getDefaultCreateMnemonicsState,
  getRandomMnemonics,
  useCreateMnemonicsStore,
} from '@/ui/state/createMnemonics';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    generatePreMnemonic: jest.fn(),
    getPreMnemonics: jest.fn(),
    removePreMnemonics: jest.fn(),
  },
}));

describe('create mnemonics store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCreateMnemonicsStore.setState(getDefaultCreateMnemonicsState());
  });

  test('keeps sensitive creation state in a non-persisted store', () => {
    expect(useCreateMnemonicsStore.getState()).toMatchObject({
      mnemonics: '',
      step: 'risk-check',
    });
    expect('persist' in useCreateMnemonicsStore).toBe(false);
  });

  test('reuses the encrypted pre-generated mnemonic when available', async () => {
    (wallet.getPreMnemonics as jest.Mock).mockResolvedValue(
      'existing mnemonic phrase'
    );

    await useCreateMnemonicsStore.getState().prepareMnemonicsAsync();

    expect(useCreateMnemonicsStore.getState().mnemonics).toBe(
      'existing mnemonic phrase'
    );
    expect(wallet.generatePreMnemonic).not.toHaveBeenCalled();
  });

  test('generates a mnemonic when no pre-generated value exists', async () => {
    (wallet.getPreMnemonics as jest.Mock).mockResolvedValue('');
    (wallet.generatePreMnemonic as jest.Mock).mockResolvedValue(
      'generated mnemonic phrase'
    );

    await useCreateMnemonicsStore.getState().prepareMnemonicsAsync();

    expect(useCreateMnemonicsStore.getState().mnemonics).toBe(
      'generated mnemonic phrase'
    );
  });

  test('preserves the existing step and cleanup behavior', async () => {
    (wallet.removePreMnemonics as jest.Mock).mockResolvedValue(undefined);
    useCreateMnemonicsStore.setState({ mnemonics: 'sensitive phrase' });

    useCreateMnemonicsStore.getState().stepTo('display');
    useCreateMnemonicsStore.getState().reset();
    await useCreateMnemonicsStore.getState().cleanCreateAsync();

    expect(useCreateMnemonicsStore.getState()).toMatchObject({
      mnemonics: 'sensitive phrase',
      step: 'risk-check',
    });
    expect(wallet.removePreMnemonics).toHaveBeenCalledTimes(1);
  });

  test('creates a shuffled mnemonic word list without changing its words', () => {
    expect(getRandomMnemonics('alpha beta gamma').sort()).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });
});
