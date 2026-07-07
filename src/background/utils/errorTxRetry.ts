import { hexToNumber, isHex } from 'viem';
import { getRecommendNonce } from '../controller/walletUtils/sign';
import { intToHex } from '@ethereumjs/util';
import i18n from '../service/i18n';

export type RetryUpdateType = 'nonce' | 'gasPrice' | 'origin' | false;

class TxRetry {
  private _retryUpdateType: RetryUpdateType = false;

  private _recommendNonce: string = '0x0';

  get retryUpdateType() {
    return this._retryUpdateType;
  }

  get recommendNonce() {
    return this._recommendNonce;
  }

  setRecommendNonce(nonce: string) {
    this._recommendNonce = nonce;
  }

  reset() {
    this._retryUpdateType = false;
    this._recommendNonce = '0x0';
  }

  setType(type: RetryUpdateType) {
    this._retryUpdateType = type;
  }
}

const txErrorRetryState = new TxRetry();

const getRetryTxType = () => txErrorRetryState.retryUpdateType;

const setRetryTxType = (type: RetryUpdateType) => {
  txErrorRetryState.setType(type);
};

const retryTxReset = () => {
  txErrorRetryState.reset();
};

const getRetryTxRecommendNonce = () => txErrorRetryState.recommendNonce;

const setRetryTxRecommendNonce = async ({
  nonce,
  from,
  chainId,
}: {
  nonce: string;
  from: string;
  chainId: number;
}) => {
  let recommendNonce: string = nonce;

  try {
    recommendNonce = await getRecommendNonce({
      from: from,
      chainId: chainId,
    });
    if (recommendNonce === nonce) {
      recommendNonce = intToHex(
        hexToNumber(recommendNonce as '0x${string}') + 1
      );
    }
  } catch (error) {
    recommendNonce = intToHex(hexToNumber(nonce as '0x${string}') + 1);
    console.debug('recommendNonce error', error);
  }

  txErrorRetryState.setRecommendNonce(recommendNonce);

  return recommendNonce;
};

type HintRule = {
  keywords: string[];
  messageKey: string;
  retryType: RetryUpdateType;
  getOptions?: (params: { nonce?: string | number }) => Record<string, unknown>;
};

const hintRules: HintRule[] = [
  {
    keywords: ['insufficient funds for gas'],
    messageKey: 'page.signTx.errorRetry.insufficient',
    retryType: false,
  },
  {
    keywords: [
      'max fee per gas less than block base fee',
      'transaction underpriced',
    ],
    messageKey: 'page.signTx.errorRetry.gasPriceTooLow',
    retryType: 'gasPrice',
  },
  {
    keywords: ['nonce too low'],
    messageKey: 'page.signTx.errorRetry.nonceTooLow',
    retryType: 'nonce',
    getOptions: (params) => ({
      nonce: params?.nonce
        ? typeof params.nonce === 'string' && isHex(params.nonce)
          ? hexToNumber(params.nonce as `0x${string}`)
          : typeof params.nonce === 'number'
          ? params.nonce
          : ''
        : '',
    }),
  },
  {
    keywords: ['nonce too high'],
    messageKey: 'page.signTx.errorRetry.nonceTooHigh',
    retryType: false,
  },
  {
    keywords: ['already known'],
    messageKey: 'page.signTx.errorRetry.alreadySubmitted',
    retryType: false,
  },
  {
    keywords: ['exceeds block gas limit'],
    messageKey: 'page.signTx.errorRetry.gasExceedsBlockGasLimit',
    retryType: false,
  },
  {
    keywords: ['invalid transaction', 'invalid sender'],
    messageKey: 'page.signTx.errorRetry.InvalidTx',
    retryType: false,
  },
  {
    keywords: ['intrinsic gas too low'],
    messageKey: 'page.signTx.errorRetry.gasLimitTooLow',
    retryType: false,
  },
];

const getTxFailedResult = (
  origin: string,
  params?: { nonce?: string | number }
): [string, RetryUpdateType] => {
  const lowerText = origin.toLowerCase();

  for (const rule of hintRules) {
    if (
      rule.keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))
    ) {
      const options = { nonce: getRetryTxRecommendNonce(), ...params };
      return [
        i18n.t(rule.messageKey, rule.getOptions?.(options)),
        rule.retryType,
      ];
    }
  }

  return [origin, false] as [string, RetryUpdateType];
};

export const bgRetryTxMethods = {
  getRetryTxType,
  setRetryTxType,
  retryTxReset,
  getRetryTxRecommendNonce,
  setRetryTxRecommendNonce,
  getTxFailedResult,
};

// export const useDebugToastErrorTxRetryInfo = ({
//   description,
//   isFailedTx,
//   tx,
//   account,
// }: {
//   description: string;
//   isFailedTx: boolean;
//   tx: {
//     chainId?: number;
//     from?: string;
//     nonce?: string;
//     gasPrice?: string;
//     maxFeePerGas?: string;
//   };
//   account?: Account;
// }) => {
//   useEffect(() => {
//     if (
//       isSelfhostRegPkg &&
//       description &&
//       isFailedTx &&
//       tx.chainId &&
//       tx.from &&
//       tx.nonce
//     ) {
//       toast.info(
//         `
//                 origin error: ${description}
//                 nonce: ${tx.nonce}
//                 gasPrice: ${tx.gasPrice || tx.maxFeePerGas}
//                 `,
//         { duration: 3000 },
//       );
//     }
//   }, [
//     account,
//     description,
//     isFailedTx,
//     tx.chainId,
//     tx.from,
//     tx.gasPrice,
//     tx.maxFeePerGas,
//     tx.nonce,
//   ]);
// };
