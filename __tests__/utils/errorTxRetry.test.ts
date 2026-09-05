let mockTranslationReady = false;

const mockT = jest.fn((key: string) =>
  mockTranslationReady ? `translated:${key}` : key
);

jest.mock('@/background/service/i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => mockT(key),
  },
}));

jest.mock('@/background/controller/walletUtils/sign', () => ({
  getRecommendNonce: jest.fn(),
}));

import { bgRetryTxMethods } from '@/background/utils/errorTxRetry';

describe('error tx retry i18n', () => {
  beforeEach(() => {
    mockTranslationReady = false;
    mockT.mockClear();
  });

  test('translates retry hints when matching the error instead of at module load', () => {
    mockTranslationReady = true;

    const [message, retryType] = bgRetryTxMethods.getTxFailedResult(
      'transaction underpriced'
    );

    expect(message).toBe('translated:page.signTx.errorRetry.gasPriceTooLow');
    expect(retryType).toBe('gasPrice');
  });

  test('keeps retry decisions isolated by scope', () => {
    bgRetryTxMethods.setRetryTxType('gasPrice', 'flow-a');
    bgRetryTxMethods.setRetryTxType('nonce', 'flow-b');

    expect(bgRetryTxMethods.getRetryTxType('flow-a')).toBe('gasPrice');
    expect(bgRetryTxMethods.getRetryTxType('flow-b')).toBe('nonce');

    bgRetryTxMethods.retryTxReset('flow-a');

    expect(bgRetryTxMethods.getRetryTxType('flow-a')).toBe(false);
    expect(bgRetryTxMethods.getRetryTxType('flow-b')).toBe('nonce');
  });
});
