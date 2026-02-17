import { Account } from 'background/service/preference';
import { AccountHistoryItem, MarketData } from '@/ui/models/perps';
import { Meta, AssetCtx, MarginTable } from '@rabby-wallet/hyperliquid-sdk';
import { PerpTopToken } from '@rabby-wallet/rabby-api/dist/types';
import { PERPS_MAX_NTL_VALUE, PERPS_POSITION_RISK_LEVEL } from './constants';
import { useWallet, WalletController } from '@/ui/utils';
import { KEYRING_CLASS } from '@/constant';
import { getPerpsSDK } from './sdkManager';
import { maxBy } from 'lodash';

const getPxDecimals = (markPx: string) => {
  const parts = markPx.split('.');
  if (!parts[1]) return 2;
  const decimalPart = parts[1];
  return decimalPart.length;
};

export const formatMarkData = (
  marketData: [Meta, AssetCtx[]],
  topAssets: PerpTopToken[],
  xyzMarketData: [Meta, AssetCtx[]]
): MarketData[] => {
  try {
    if (!Array.isArray(marketData) || marketData.length < 2) {
      console.error(
        'Failed to format market data: marketData is not an array or has less than 2 items'
      );
      return [];
    }

    const meta = marketData[0];
    const metrics = marketData[1];
    if (!meta || !Array.isArray(meta.universe) || !Array.isArray(metrics)) {
      console.error(
        'Failed to format market data: meta or metrics is not an array'
      );
      return [];
    }

    const marginTableMap: Record<number, MarginTable> = {};
    if (Array.isArray(meta.marginTables)) {
      for (const entry of meta.marginTables) {
        const [id, table] = entry || [];
        if (id != null) marginTableMap[id] = table;
      }
    }

    const xyzMarginTableMap: Record<number, MarginTable> = {};
    if (
      xyzMarketData?.[0]?.marginTables &&
      Array.isArray(xyzMarketData[0].marginTables)
    ) {
      for (const entry of xyzMarketData[0].marginTables) {
        const [id, table] = entry || [];
        if (id != null) xyzMarginTableMap[id] = table;
      }
    }

    const result: MarketData[] = topAssets
      .map((topAsset) => {
        const index = topAsset.id;
        const dexId = topAsset.dex_id;
        const meta = dexId === 'xyz' ? xyzMarketData[0] : marketData[0];
        const metrics = dexId === 'xyz' ? xyzMarketData[1] : marketData[1];
        const tableMap = dexId === 'xyz' ? xyzMarginTableMap : marginTableMap;
        const hlDataAsset = meta.universe[index];

        if (!hlDataAsset) return null;

        if (hlDataAsset.isDelisted) return null;

        const m = metrics[index] || {};
        const table = tableMap[hlDataAsset?.marginTableId];
        const tiers = table?.marginTiers || [];
        const firstTier =
          Array.isArray(tiers) && tiers.length > 0 ? tiers[0] : undefined;
        const nextTier =
          Array.isArray(tiers) && tiers.length > 1 ? tiers[1] : undefined;

        const item: MarketData = {
          index,
          dexId: topAsset.dex_id,
          name: String(topAsset.name ?? ''),
          // 取保证金表第一档的最大杠杆；若无表则回退 asset.maxLeverage
          maxLeverage: Number(
            firstTier?.maxLeverage ?? hlDataAsset?.maxLeverage
          ),
          minLeverage: 1,
          // 第一档的最大名义值 = 下一档的 lowerBound；若不存在下一档则为兜底1000000
          maxUsdValueSize: String(nextTier?.lowerBound ?? PERPS_MAX_NTL_VALUE),
          szDecimals: Number(hlDataAsset.szDecimals ?? 0),
          // 根据 markPx 推断价格精度
          pxDecimals: getPxDecimals(m?.markPx ?? ''),
          dayBaseVlm: String(m?.dayBaseVlm ?? '0'),
          dayNtlVlm: String(m?.dayNtlVlm ?? '0'),
          funding: String(m?.funding ?? '0'),
          markPx: String(m?.markPx ?? ''),
          midPx: String(m?.midPx ?? ''),
          openInterest: String(m?.openInterest ?? '0'),
          oraclePx: String(m?.oraclePx ?? ''),
          premium: String(m?.premium ?? '0'),
          prevDayPx: String(m?.prevDayPx ?? ''),
          logoUrl:
            topAsset.full_logo_url ||
            `https://app.hyperliquid.xyz/coins/${topAsset.name}.svg`,
        };
        return item;
      })
      .filter(Boolean) as MarketData[];

    return result;
  } catch (e) {
    console.error('Failed to format market data:', e);
    return [];
  }
};

export const calLiquidationPrice = (
  markPrice: number,
  margin: number,
  direction: 'Long' | 'Short',
  positionSize: number,
  nationalValue: number,
  maxLeverage: number
) => {
  const MMR = 1 / maxLeverage / 2;
  const side = direction === 'Long' ? 1 : -1;
  // const nationalValue = margin * leverage;
  const maintenance_margin_required = nationalValue * MMR;
  const margin_available = margin - maintenance_margin_required;
  const liq_price =
    markPrice - (side * margin_available) / positionSize / (1 - MMR * side);
  // liq_price = price - side * margin_available / position_size / (1 - l * side)
  return Math.max(liq_price, 0);
};

/**
 * Calculate the distance to liquidation as a percentage
 * @param liquidationPrice - The liquidation price
 * @param markPrice - The current mark price
 * @returns The absolute distance to liquidation as a decimal (e.g., 0.05 for 5%)
 */
export const calculateDistanceToLiquidation = (
  liquidationPrice: number | string | undefined,
  markPrice: number | string | undefined
): number => {
  const liqPx = Number(liquidationPrice || 0);
  const markPx = Number(markPrice || 0);
  if (markPx === 0) {
    return 0;
  }
  return Math.abs((liqPx - markPx) / markPx);
};

export const getRiskLevel = (
  distanceLiquidation: number
): PERPS_POSITION_RISK_LEVEL => {
  if (distanceLiquidation <= 0.03) {
    return PERPS_POSITION_RISK_LEVEL.DANGER;
  } else if (distanceLiquidation > 0.03 && distanceLiquidation < 0.08) {
    return PERPS_POSITION_RISK_LEVEL.WARNING;
  } else {
    return PERPS_POSITION_RISK_LEVEL.SAFE;
  }
};

export const formatPercent = (value: number, decimals = 8) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatPerpsPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export const calTransferMarginRequired = (
  markPrice: number,
  positionSize: number,
  leverage: number
) => {
  const nationalValue = Number(positionSize) * Number(markPrice);
  const initialNationalValue = Number(positionSize) * Number(markPrice);
  const initialMarginRequired = initialNationalValue * (1 / leverage);
  const transferMarginRequired = Math.max(
    initialMarginRequired,
    0.1 * nationalValue
  );
  return transferMarginRequired;
};

const MAX_SIGNIFICANT_FIGURES = 6;

export const validatePriceInput = (
  value: string,
  szDecimals: number
): boolean => {
  if (!/^[0-9.]*$/.test(value) || value.split('.').length > 2) return false;

  if (!value || value === '0' || value === '0.') return true;

  // Check if it's an integer (no decimal point or ends with decimal point)
  if (!value.includes('.') || value.endsWith('.')) {
    return true; // Integers are always allowed
  }

  // Split integer and decimal parts
  const [integerPart, decimalPart] = value.split('.');

  // Check decimal places: max (6 - szDecimals)
  const maxDecimals = 6 - szDecimals;
  if (decimalPart.length > maxDecimals) {
    return false;
  }

  // Calculate significant figures (remove leading zeros)
  const allDigits = (integerPart + decimalPart).replace(/^0+/, '');
  if (allDigits.length > 5) {
    return false;
  }

  return true;
};

export const validateTradeAmount = (value: string, szDecimals: number) => {
  if (!value || value === '0' || value === '0.') return true;
};

export const formatTradeAmount = (value: string, szDecimals: number) => {
  if (!value || value === '0' || value === '0.') return '0';
  return value;
};

/**
 * Format TP/SL price to ensure it passes validation
 * Rules:
 * 1. Decimal places <= (6 - szDecimals)
 * 2. Significant figures <= 5
 * 3. Can be downgraded to integer if decimal part is all zeros
 * @param price - The price number to format
 * @param szDecimals - Size decimals parameter
 * @returns Formatted price string that will always pass validatePriceInput
 */
export const formatTpOrSlPrice = (
  price: number,
  szDecimals: number
): string => {
  if (!price || price === 0) {
    return '0';
  }

  const vStr = price.toString();
  if (!vStr.includes('.')) {
    // Integer: always valid
    return vStr;
  }

  const [integerPart, decimalPart] = vStr.split('.');

  // Rule: if integer part has 6+ digits, force integer to always pass validator
  if (integerPart.length >= 6) {
    return integerPart;
  }

  // Calculate max decimal places: (6 - szDecimals)
  const maxDecimals = MAX_SIGNIFICANT_FIGURES - szDecimals;

  // Calculate significant figures (same logic as validatePriceInput)
  // Merge integer and decimal parts first, then remove leading zeros
  const allSignificantDigits = (integerPart + decimalPart).replace(/^0+/, '');
  const integerDigits = integerPart.replace(/^0+/, '');

  // If significant digits <= 5, just limit decimal places
  if (allSignificantDigits.length <= 5) {
    if (decimalPart.length > maxDecimals) {
      const newDecimalPart = decimalPart.slice(0, maxDecimals);
      // Remove trailing zeros
      const trimmedDecimal = newDecimalPart.replace(/0+$/, '');
      if (trimmedDecimal) {
        return `${integerPart}.${trimmedDecimal}`;
      }
      return `${integerPart}`;
    }
    // Remove trailing zeros from original
    const trimmedDecimal = decimalPart.replace(/0+$/, '');
    if (trimmedDecimal) {
      return `${integerPart}.${trimmedDecimal}`;
    }
    return `${integerPart}`;
  }

  // Significant digits > 5
  // Integer significant digits = non-zero digits in integer part (leading zeros removed)
  const integerPartLength = integerDigits.length;

  if (integerPartLength >= 5) {
    // When integer already occupies 5 digits, drop decimals to pass validator
    return integerPart;
  }

  // Calculate remaining digits allowed in decimal part
  // Note: every digit in decimalPart counts toward allDigits length
  const remainingDigits = 5 - integerPartLength;

  // Limit decimal part to the minimum of remainingDigits and maxDecimals
  const maxDecimalLength = Math.min(remainingDigits, maxDecimals);
  let composedDecimal = decimalPart.slice(0, maxDecimalLength);

  // Remove trailing zeros
  composedDecimal = composedDecimal.replace(/0+$/, '');
  if (composedDecimal) {
    return `${integerPart}.${composedDecimal}`;
  }
  return `${integerPart}`;
};

export const checkPerpsReference = async ({
  wallet,
  account,
  scene = 'invite',
}: {
  wallet: ReturnType<typeof useWallet>;
  account?: Account | null;
  scene?: 'invite' | 'connect' | 'protocol';
}) => {
  try {
    const address = account?.address;
    if (!address) {
      return false;
    }
    if (
      !Object.values(KEYRING_CLASS.HARDWARE)
        .concat([KEYRING_CLASS.PRIVATE_KEY, KEYRING_CLASS.MNEMONIC])
        .includes(account.type)
    ) {
      return false;
    }
    if (scene !== 'protocol') {
      const inviteConfig = await wallet.getPerpsInviteConfig(address);
      const lastTime =
        scene === 'connect'
          ? inviteConfig?.lastConnectedAt
          : inviteConfig?.lastInvitedAt;
      if (lastTime) {
        const now = Date.now();
        const diff = now - lastTime;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (diff < oneWeek) {
          return false;
        }
      }
    }
    const sdk = getPerpsSDK();
    const info = await sdk.info.getClearingHouseState(address);
    const needDepositFirst =
      Number(info?.marginSummary?.accountValue || 0) === 0 &&
      Number(info?.withdrawable || 0) === 0;
    if (needDepositFirst) {
      return false;
    }
    const data = await sdk.info.getReferral(account?.address || '');

    if (data?.referredBy) {
      return false;
    }

    return true;
  } catch (e) {
    console.error('checkPerpsReference error', e);
    return false;
  }
};

export const getMaxTimeFromAccountHistory = (
  historyList: AccountHistoryItem[]
) => {
  const depositList = historyList.filter((item) => item.type === 'deposit');
  const withdrawList = historyList.filter((item) => item.type === 'withdraw');
  const receiveList = historyList.filter((item) => item.type === 'receive');
  const depositMaxTime = maxBy(depositList, 'time')?.time || 0;
  const withdrawMaxTime = maxBy(withdrawList, 'time')?.time || 0;
  const receiveMaxTime = maxBy(receiveList, 'time')?.time || 0;
  return {
    depositMaxTime,
    withdrawMaxTime,
    receiveMaxTime,
  };
};
