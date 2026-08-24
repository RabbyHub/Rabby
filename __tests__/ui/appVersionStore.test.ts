import { getUpdateContent } from 'changeLogs/index';

import { useAppVersionStore } from '@/ui/state/appVersion';
import { wallet } from '@/ui/wallet';

jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    onCreated: {
      addListener: jest.fn(),
    },
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getIsFirstOpen: jest.fn(),
    getIsNewUser: jest.fn(),
    updateIsFirstOpen: jest.fn(),
  },
}));

jest.mock('changeLogs/index', () => ({
  getUpdateContent: jest.fn(),
}), { virtual: true });

const mockedGetUpdateContent = getUpdateContent as jest.Mock;
const mockedGetIsFirstOpen = wallet.getIsFirstOpen as jest.Mock;
const mockedGetIsNewUser = wallet.getIsNewUser as jest.Mock;
const mockedUpdateIsFirstOpen = wallet.updateIsFirstOpen as jest.Mock;
const originalRelease = process.env.release;

describe('app version store', () => {
  beforeEach(() => {
    mockedGetUpdateContent.mockReset();
    mockedGetIsFirstOpen.mockReset();
    mockedGetIsNewUser.mockReset();
    mockedUpdateIsFirstOpen.mockReset();
    useAppVersionStore.setState({
      firstNotice: false,
      updateContent: '',
      version: '',
      isNewUser: true,
    });
  });

  afterAll(() => {
    if (originalRelease === undefined) {
      delete process.env.release;
    } else {
      process.env.release = originalRelease;
    }
  });

  test('uses the existing app version defaults', () => {
    expect(useAppVersionStore.getState()).toMatchObject({
      firstNotice: false,
      updateContent: '',
      version: '',
      isNewUser: true,
    });
  });

  test('loads first-open state and falls back to the bundled changelog', async () => {
    process.env.release = '9.9.9';
    mockedGetIsFirstOpen.mockResolvedValue(true);
    mockedGetIsNewUser.mockResolvedValue(false);
    mockedGetUpdateContent.mockReturnValue('Fallback changelog');
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await useAppVersionStore.getState().checkIfFirstLoginAsync('zh-CN');
    consoleError.mockRestore();

    expect(mockedGetIsFirstOpen).toHaveBeenCalledTimes(1);
    expect(mockedGetIsNewUser).toHaveBeenCalledTimes(1);
    expect(useAppVersionStore.getState()).toMatchObject({
      firstNotice: true,
      updateContent: 'Fallback changelog',
      version: '9.9.9',
      isNewUser: false,
    });
  });

  test('dismisses the notice and updates the background preference', () => {
    useAppVersionStore.setState({ firstNotice: true });

    useAppVersionStore.getState().afterFirstLogin();

    expect(useAppVersionStore.getState().firstNotice).toBe(false);
    expect(mockedUpdateIsFirstOpen).toHaveBeenCalledTimes(1);
  });
});
