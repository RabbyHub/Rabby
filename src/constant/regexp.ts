/**
 * Regex for input number
 * 1. Can't have more than one dot
 * 2. Can't have more than one leading zero
 * 3. Can't have non-numeric characters
 */
export const INPUT_NUMBER_RE = /^(?!0{2,})[0-9]*(?!.*\..*\.)[0-9.]*$/;

// filter start with 0 or 0.
// replace start with . to 0.
export const filterNumber = (value: string = '') => {
  return value.replace(/^0*(\d+)/, '$1').replace(/^\./, '0.');
};
