import useSyncStaleValue from '@/ui/hooks/useDebounceValue';
import { isSameAddress } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useState } from 'react';
import type { QuoteProvider } from './quote';

type SwapProgressStatus = 'pending' | 'success' | 'failed' | null;

interface UseSwapMainRenderStateParams {
  form: {
    chain: CHAINS_ENUM;
    inputAmount: string;
    payToken?: TokenItem;
    receiveToken?: TokenItem;
    inSufficient: boolean;
    inSufficientCanGetQuote: boolean;
  };
  quote: {
    loading: boolean;
    activeProvider?: QuoteProvider;
    showMoreVisible: boolean;
  };
  page: {
    isSupportedChain: boolean;
    hasExternalDapps: boolean;
  };
  risk: {
    isSlippageLow: boolean;
    isSlippageHigh: boolean;
    showLoss: boolean;
  };
  directSign: {
    enabled: boolean;
    accountType?: string;
    buildLoading: boolean;
    currentTxsLength: number;
    awaitingTopUpResume: boolean;
    depositFlowActive: boolean;
  };
  pending: {
    type: 'swap' | 'approveSwap';
    approveHash?: string;
  };
}

export const useSwapMainRenderState = ({
  form,
  quote,
  page,
  risk,
  directSign,
  pending,
}: UseSwapMainRenderStateParams) => {
  const [
    swapProgressStatus,
    setSwapProgressStatus,
  ] = useState<SwapProgressStatus>(null);

  const amountAvailable = Number(form.inputAmount) > 0;
  const hasTokenPair = !!form.payToken && !!form.receiveToken;
  const isSameTokenPair =
    !!form.payToken &&
    !!form.receiveToken &&
    isSameAddress(form.payToken.id, form.receiveToken.id);
  const isShowMoreVisible =
    quote.showMoreVisible &&
    amountAvailable &&
    form.inSufficientCanGetQuote &&
    hasTokenPair;
  const noQuoteOrigin =
    amountAvailable &&
    form.inSufficientCanGetQuote &&
    !quote.loading &&
    hasTokenPair &&
    !quote.activeProvider;
  const noQuote = useSyncStaleValue(noQuoteOrigin, 10);
  const hasSwapProgress = swapProgressStatus !== null;
  const shouldPrioritizeSwapProgress =
    !amountAvailable && pending.type === 'swap' && hasSwapProgress;

  const swapBtnDisabled = page.isSupportedChain
    ? quote.loading ||
      !hasTokenPair ||
      !amountAvailable ||
      form.inSufficient ||
      !quote.activeProvider
    : !page.hasExternalDapps;
  const canPrepareDirectSign =
    directSign.enabled &&
    !swapBtnDisabled &&
    !!quote.activeProvider &&
    !directSign.awaitingTopUpResume &&
    !directSign.depositFlowActive;
  const quoteListRenderData =
    form.payToken && form.receiveToken && form.chain
      ? {
          payToken: form.payToken,
          receiveToken: form.receiveToken,
          chain: form.chain,
        }
      : null;

  return {
    amountAvailable,
    swapBtnDisabled,
    showMEVGuardedSwitch: form.chain === CHAINS_ENUM.ETH,
    showRiskTips: risk.isSlippageLow || risk.isSlippageHigh || risk.showLoss,
    directSignTxPreparing:
      canPrepareDirectSign &&
      (directSign.buildLoading || !directSign.currentTxsLength),
    noQuote,
    showUnsupportedChainTips: !page.isSupportedChain,
    showQuoteAlert: !form.inSufficientCanGetQuote || noQuote,
    showPendingTxItem:
      !!pending.approveHash ||
      Boolean(!isShowMoreVisible && !quote.activeProvider?.quote),
    showStickyInfo:
      hasTokenPair &&
      !isSameTokenPair &&
      !noQuote &&
      page.isSupportedChain &&
      !shouldPrioritizeSwapProgress,
    showSubmitTooltip:
      (!page.isSupportedChain && !page.hasExternalDapps) ||
      (form.inSufficient && !!quote.activeProvider),
    showDirectSignButton: directSign.enabled && !!directSign.accountType,
    quoteListRenderData,
    setSwapProgressStatus,
  };
};
