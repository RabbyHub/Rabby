import { valueToBigNumber } from '@aave/math-utils';
import { OptimalRate, SwapSide } from '@paraswap/sdk';
import { constants } from 'ethers';

import { getParaswap } from '../../config/paraswap';
import {
  ParaswapRatesType,
  ProviderRatesParams,
  SwapProvider,
} from '../../types/swap';

export async function getParaswapSellRates({
  chainId,
  amount,
  srcToken,
  srcDecimals,
  destToken,
  destDecimals,
  user,
  side = 'sell',
  options = {},
  invertedQuoteRoute = false,
}: ProviderRatesParams): Promise<ParaswapRatesType> {
  const { paraswap } = getParaswap(chainId);

  return paraswap
    .getRate({
      amount,
      srcToken,
      srcDecimals,
      destToken,
      destDecimals,
      userAddress: user || constants.AddressZero,
      side: side === 'buy' ? SwapSide.BUY : SwapSide.SELL,
      options: {
        ...options,
        excludeDEXS: [
          'ParaSwapPool',
          'ParaSwapLimitOrders',
          'SwaapV2',
          'Hashflow',
          'Dexalot',
          'Bebop',
        ],
      },
    })
    .then((paraSwapResponse: OptimalRate) => {
      if (invertedQuoteRoute) {
        return {
          srcToken: destToken,
          srcSpotUSD: paraSwapResponse.destUSD,
          srcSpotAmount: paraSwapResponse.destAmount,
          srcTokenPriceUsd: Number(
            valueToBigNumber(paraSwapResponse.destUSD)
              .dividedBy(paraSwapResponse.destAmount)
              .toString()
          ),
          srcDecimals: destDecimals,
          destToken: srcToken,
          destSpotUSD: paraSwapResponse.srcUSD,
          destSpotAmount: paraSwapResponse.srcAmount,
          destTokenPriceUsd: Number(
            valueToBigNumber(paraSwapResponse.srcUSD)
              .dividedBy(paraSwapResponse.srcAmount)
              .toString()
          ),
          afterFeesUSD: paraSwapResponse.srcUSD,
          afterFeesAmount: paraSwapResponse.srcAmount,
          destDecimals: srcDecimals,
          provider: SwapProvider.PARASWAP,
          optimalRateData: paraSwapResponse,
        };
      }

      return {
        srcToken,
        srcSpotUSD: paraSwapResponse.srcUSD,
        srcSpotAmount: paraSwapResponse.srcAmount,
        srcTokenPriceUsd: Number(
          valueToBigNumber(paraSwapResponse.srcUSD)
            .dividedBy(paraSwapResponse.srcAmount)
            .toString()
        ),
        srcDecimals,
        destToken,
        destSpotUSD: paraSwapResponse.destUSD,
        destSpotAmount: paraSwapResponse.destAmount,
        destTokenPriceUsd: Number(
          valueToBigNumber(paraSwapResponse.destUSD)
            .dividedBy(paraSwapResponse.destAmount)
            .toString()
        ),
        afterFeesUSD: paraSwapResponse.destUSD,
        afterFeesAmount: paraSwapResponse.destAmount,
        destDecimals,
        provider: SwapProvider.PARASWAP,
        optimalRateData: paraSwapResponse,
      };
    });
}
