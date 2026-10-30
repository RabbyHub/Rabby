jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

import * as Sentry from '@sentry/browser';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { reportMessageError } from '@/background/utils/messageErrorReporter';

const captureException = Sentry.captureException as jest.Mock;

const PRIVATE_KEY =
  '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
const MNEMONIC = 'test test test test test test test test test test test junk';

const FRAMES = [
  '    at WalletController.importPrivateKey (chrome-extension://id/background.js:1:200)',
  '    at PortMessage.onRequest (chrome-extension://id/background.js:1:300)',
];

// What V8 throws when it trips over a value: the message quotes it, and the
// stack opens by repeating the message.
const engineError = (message: string) => {
  const error = new TypeError(message);
  error.stack = [`TypeError: ${message}`, ...FRAMES].join('\n');
  return error;
};

const quotingError = (secret: string) =>
  engineError(`Cannot create property 'type' on string '${secret}'`);

const reported = () => captureException.mock.calls[0]?.[0] as Error;

beforeEach(() => {
  captureException.mockClear();
});

describe('errors from methods that handle secrets', () => {
  it('reports a programming error with the message withheld', () => {
    const error = quotingError(PRIVATE_KEY);

    expect(
      reportMessageError(error, {
        type: 'controller',
        method: 'importPrivateKey',
        params: [PRIVATE_KEY],
      })
    ).toBe(true);

    const sent = reported();
    expect(sent).not.toBe(error);
    expect(sent.name).toBe('TypeError');
    expect(sent.message).toBe('message withheld (wallet.importPrivateKey)');
    // The frames still point at the bug.
    expect(sent.stack).toBe(
      ['TypeError: message withheld (wallet.importPrivateKey)', ...FRAMES].join(
        '\n'
      )
    );
    expect(`${sent.message}\n${sent.stack}`).not.toContain(PRIVATE_KEY);
  });

  it('drops every message line from the stack, not just the first', () => {
    reportMessageError(engineError(`Unexpected words:\n${MNEMONIC}\nend`), {
      method: 'validateMnemonic',
      params: [MNEMONIC],
    });

    expect(reported().stack).not.toContain('test test');
    expect(reported().stack).toContain(FRAMES[0]);
  });

  it('keeps Firefox frames, which carry no message line', () => {
    const error = new TypeError(`bad share ${MNEMONIC}`);
    error.stack = [
      'importPrivateKey@moz-extension://id/background.js:1:200',
      'onRequest@moz-extension://id/background.js:1:300',
      '',
    ].join('\n');

    reportMessageError(error, { method: 'slip39DecodeMnemonic', params: [] });

    expect(reported().stack).toBe(
      [
        'TypeError: message withheld (wallet.slip39DecodeMnemonic)',
        'importPrivateKey@moz-extension://id/background.js:1:200',
        'onRequest@moz-extension://id/background.js:1:300',
      ].join('\n')
    );
  });

  // The page's copy carries the original message, so the background claims
  // it even when there is nothing worth reporting.
  it('claims business errors without reporting them', () => {
    expect(
      reportMessageError(new Error(`Invalid mnemonic: ${MNEMONIC}`), {
        method: 'createKeyringWithMnemonics',
        params: [MNEMONIC],
      })
    ).toBe(true);
    expect(captureException).not.toHaveBeenCalled();
  });

  it.each([
    'boot',
    'unlock',
    'verifyPassword',
    'getPrivateKey',
    'getMnemonics',
    'getMnemonicByAddress',
    'getMnemonicKeyringPassphrase',
    'importJson',
    'slip39GetThreshold',
    'setWhitelist',
    'setBiometricUnlock',
  ])('treats %s as handling secrets', (method) => {
    reportMessageError(quotingError(PRIVATE_KEY), { method, params: [] });

    expect(reported().message).toBe(`message withheld (wallet.${method})`);
  });

  it('treats requestKeyring as secret only on the software keyrings', () => {
    reportMessageError(quotingError(MNEMONIC), {
      method: 'requestKeyring',
      params: [KEYRING_TYPE.HdKeyring, 'getAccounts', null],
    });
    expect(reported().message).toBe('message withheld (wallet.requestKeyring)');

    captureException.mockClear();
    const ledgerError = quotingError('device');
    reportMessageError(ledgerError, {
      method: 'requestKeyring',
      params: [KEYRING_CLASS.HARDWARE.LEDGER, 'getInitialAccounts', null],
    });
    expect(reported()).toBe(ledgerError);
  });
});

describe('errors from other methods', () => {
  it('reports programming errors as they are', () => {
    const error = engineError(
      "Cannot read properties of undefined (reading 'x')"
    );

    expect(
      reportMessageError(error, { method: 'getCurrentAccount', params: [] })
    ).toBe(true);
    expect(reported()).toBe(error);
  });

  it('leaves business errors unreported', () => {
    expect(
      reportMessageError(new Error('no current account'), {
        method: 'getCurrentAccount',
        params: [],
      })
    ).toBe(false);
    expect(captureException).not.toHaveBeenCalled();
  });
});
