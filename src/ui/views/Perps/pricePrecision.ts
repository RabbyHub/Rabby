/**
 * Hyperliquid price precision rules shared by TP/SL and limit price inputs.
 *
 * Kept in a leaf module so pure TP/SL rules can import it without dragging
 * `Perps/utils` (store, SDK, wallet) into unit tests.
 */
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
  const remainingDigits = 5 - integerPartLength;
  // Below 1, the zeros right after the point are not significant
  // (0.094616 has 5 significant figures), so they don't use up the budget.
  const leadingZeros = integerDigits
    ? 0
    : decimalPart.length - decimalPart.replace(/^0+/, '').length;

  // Limit decimal part to the minimum of remainingDigits and maxDecimals
  const maxDecimalLength = Math.min(
    leadingZeros + remainingDigits,
    maxDecimals
  );
  let composedDecimal = decimalPart.slice(0, maxDecimalLength);

  // Remove trailing zeros
  composedDecimal = composedDecimal.replace(/0+$/, '');
  if (composedDecimal) {
    return `${integerPart}.${composedDecimal}`;
  }
  return `${integerPart}`;
};
