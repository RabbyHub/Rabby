/**
 * Regex for input number
 * 1. Can't have more than one dot
 * 2. Can't have more than one leading zero
 * 3. Can't have non-numeric characters
 */
export const INPUT_NUMBER_RE = /^(?!0{2,})[0-9]*(?!.*\..*\.)[0-9.]*$/;

/**
 * Regex for input integer
 * 1. Can't have non-numeric characters
 * 2. Can't have leading zero
 */
export const INPUT_INTEGER_RE = /^[1-9]\d*$/;

// filter start with 0 or 0.
// replace start with . to 0.
export const filterNumber = (value: string = '') => {
  return value.replace(/^0*(\d+)/, '$1').replace(/^\./, '0.');
};
