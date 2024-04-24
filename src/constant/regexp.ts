/**
 * Regex for input number
 * 1. Can't start with a dot
 * 2. Can't have more than one dot
 * 3. Can't have more than one leading zero
 * 4. Can't have non-numeric characters
 */
export const INPUT_NUMBER_RE = /^(?!\.)(?!0{2,})[0-9]*(?!.*\..*\.)[0-9.]*$/;

/**
 * Regex for input integer
 * 1. Can't have non-numeric characters
 * 2. Can't have leading zero
 */
export const INPUT_INTEGER_RE = /^[1-9]\d*$/;
