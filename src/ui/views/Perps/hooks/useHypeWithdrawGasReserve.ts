import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useAsync } from 'react-use';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';
import {
  HYPE_USDC_TOKEN_SERVER_CHAIN,
  HYPE_CORE_TO_EVM_GAS,
  HYPE_GAS_RESERVE_BUFFER,
  HYPE_GAS_FEE_IN_HYPE,
} from '../constants';

const HYPE_DECIMALS = 18;

/**
 * USD value of the HYPE gas to reserve from a HyperCore -> HyperEVM stablecoin
 * withdrawal: when the account holds no HYPE, the protocol takes this gas out
 * of the transferred stablecoin, so the sent amount must leave it behind.
 */
export const useHypeWithdrawGasReserve = ({
  enabled,
  hypePrice,
}: {
  enabled: boolean;
  hypePrice: number;
}) => {
  const wallet = useWallet();

  const { value: gasList } = useAsync(async () => {
    if (!enabled) return [] as GasLevel[];
    return wallet.gasMarketV2({ chainId: HYPE_USDC_TOKEN_SERVER_CHAIN });
  }, [enabled]);

  return useMemo(() => {
    // The transfer is charged at the base gas price (no priority tip).
    const normal = gasList?.find((e) => e.level === 'normal') ?? gasList?.[0];
    const baseFeeWei = normal?.base_fee || normal?.price || 0;

    const gasInHype =
      baseFeeWei > 0
        ? new BigNumber(HYPE_CORE_TO_EVM_GAS)
            .times(baseFeeWei)
            .div(10 ** HYPE_DECIMALS)
            .times(HYPE_GAS_RESERVE_BUFFER)
        : new BigNumber(HYPE_GAS_FEE_IN_HYPE);

    return gasInHype.times(hypePrice || 0).toNumber();
  }, [gasList, hypePrice]);
};
