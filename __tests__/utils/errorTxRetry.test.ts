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
import { getRecommendNonce } from '@/background/controller/walletUtils/sign';

test('calculating a waiting approval nonce cannot overwrite another local task retry', async () => {
  (getRecommendNonce as jest.Mock).mockResolvedValueOnce('0x9');
  await bgRetryTxMethods.setRetryTxRecommendNonce({
    from: 'A',
    chainId: 1,
    nonce: '0x8',
  });
  (getRecommendNonce as jest.Mock).mockResolvedValueOnce('0x2');
  expect(
    await bgRetryTxMethods.calculateRetryTxNonce({
      from: 'B',
      chainId: 1,
      nonce: '0x2',
    })
  ).toBe('0x3');
  expect(bgRetryTxMethods.getRetryTxRecommendNonce()).toBe('0x9');
});

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
});
