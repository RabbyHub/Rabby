import type { OpenApiService } from '@rabby-wallet/rabby-api';
import { validateDepositBridgeQuote } from '@rabby-wallet/rabby-bridge';
import type { DepositBridgeQuote } from '@rabby-wallet/rabby-bridge';
import { GAS_ACCOUNT_BRIDGE_COLLECTION_ADDRESS } from '@/constant/gas-account';
import { reportBridgeSdkError } from './bridge-sdk-report';
import type { BridgeDepositSource } from './bridge-sdk-report';

type DepositQuoteRequest = Parameters<OpenApiService['getPerpBridgeQuote']>[0];

export const validateDepositQuote = (
  quote: DepositBridgeQuote,
  request: DepositQuoteRequest,
  source: BridgeDepositSource
) =>
  validateDepositBridgeQuote(quote, {
    userAddress: request.user_addr,
    receiverAddress:
      source === 'perps_deposit'
        ? request.user_addr
        : GAS_ACCOUNT_BRIDGE_COLLECTION_ADDRESS,
    fromChainId: request.from_chain_id,
    fromTokenId: request.from_token_id,
    fromTokenRawAmount: request.from_token_raw_amount,
    toChainId: 'hyperliquid',
    toTokenId: '0x00000000000000000000000000000000',
    slippage: '0.01',
    onError: (report) => reportBridgeSdkError(report, source),
  });
