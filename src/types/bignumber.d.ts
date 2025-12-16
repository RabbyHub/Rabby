import 'bignumber.js';

declare module 'bignumber.js' {
  interface BigNumber {
    /**
     * @deprecated BigNumber#toString may emit scientific notation; use toFixed() when you need a string value.
     */
    toString(base?: number): string;
  }
}
