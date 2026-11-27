const mockMessageSuccess = jest.fn(() => jest.fn());

jest.mock('antd', () => ({
  message: { success: mockMessageSuccess },
}));
jest.mock('i18next', () => ({ t: (key: string) => key }));

import {
  clearClipboard,
  copyAddress,
  copyTextToClipboard,
} from '@/ui/utils/clipboard';

const ADDRESS = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
const CHECKSUM_ADDRESS = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

const setClipboard = (value: unknown) => {
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
  });
};

// Stands in for the browser's copy command: fires `copy` with a writable
// clipboardData, then returns what Chrome returns for an enabled command.
const mockExecCommand = (fireCopyEvent: boolean) => {
  const written: Record<string, string> = {};
  const execCommand = jest.fn(() => {
    if (fireCopyEvent) {
      const event = new Event('copy', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', {
        value: {
          setData: (type: string, data: string) => {
            written[type] = data;
          },
        },
      });
      document.dispatchEvent(event);
    }
    return true;
  });
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true,
  });
  return { execCommand, written };
};

describe('clipboard utils', () => {
  beforeEach(() => {
    mockMessageSuccess.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setClipboard(undefined);
  });

  it('resolves true once writeText succeeds', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await expect(copyTextToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('resolves false instead of rejecting when writeText fails', async () => {
    setClipboard({
      writeText: jest
        .fn()
        .mockRejectedValue(new Error('Document is not focused.')),
    });

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);
  });

  it('writes through a copy event when navigator.clipboard is missing', async () => {
    setClipboard(undefined);
    const { written } = mockExecCommand(true);

    await expect(copyTextToClipboard('hello')).resolves.toBe(true);
    expect(written['text/plain']).toBe('hello');
  });

  it('reports failure when the copy command wrote nothing', async () => {
    setClipboard(undefined);
    mockExecCommand(false);

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);
  });

  it('clears the clipboard with an empty string', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await expect(clearClipboard()).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('');
  });

  it('reports a failed clear', async () => {
    setClipboard({
      writeText: jest
        .fn()
        .mockRejectedValue(new Error('Document is not focused.')),
    });

    await expect(clearClipboard()).resolves.toBe(false);
  });

  it('clears through the fallback when navigator.clipboard is missing', async () => {
    setClipboard(undefined);
    const { written } = mockExecCommand(true);

    await expect(clearClipboard()).resolves.toBe(true);
    expect(written['text/plain']).toBe('');
  });

  it('copies the checksum address and shows the toast', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await expect(copyAddress(ADDRESS)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(CHECKSUM_ADDRESS);
    expect(mockMessageSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows no toast when the address was not copied', async () => {
    setClipboard({
      writeText: jest
        .fn()
        .mockRejectedValue(new Error('Document is not focused.')),
    });

    await expect(copyAddress(ADDRESS)).resolves.toBe(false);
    expect(mockMessageSuccess).not.toHaveBeenCalled();
  });

  it('rejects a non-hex address without writing', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await expect(copyAddress('')).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(mockMessageSuccess).not.toHaveBeenCalled();
  });
});
