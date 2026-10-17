import BigNumber from 'bignumber.js';
import { CalldataDecodeError } from '../errors';

export interface PackedSwap {
  receiver: string;
  fromAsset: string;
  toAsset: string;
  amountIn: string;
  amountOutMin: string;
}

// Magpie's libraries read absolute calldata offsets, including the selector.
// Restrict reads to the declared bytes payload rather than ABI padding.
export class PackedReader {
  private readonly hex: string;

  constructor(
    data: string,
    private readonly payloadLength: number,
    private readonly step: string
  ) {
    this.hex = data.slice(2);
  }

  private read(offset: number, length: number, field: string) {
    if (offset < 68 || offset + length > 68 + this.payloadLength) {
      throw new CalldataDecodeError(
        `${this.step}.${field}`,
        `${field} points outside the Magpie bytes payload (offset ${offset}, length ${length})`
      );
    }
    return this.hex.slice(offset * 2, (offset + length) * 2);
  }

  address(offset: number, field: string) {
    return `0x${this.read(offset, 20, field)}`.toLowerCase();
  }

  uint(offset: number, field: string, length = 32) {
    return new BigNumber(this.read(offset, length, field), 16).toFixed(0);
  }

  compact(shiftOffset: number, pointerOffset: number, field: string) {
    const shift = Number(this.uint(shiftOffset, field, 1));
    const pointer = Number(this.uint(pointerOffset, field, 2));
    // Only the high (256 - shift) bits survive Solidity's shr. A compact
    // value may end at the payload boundary; it need not contain 32 bytes.
    const significantBits = 256 - shift;
    const length = Math.ceil(significantBits / 8);
    return new BigNumber(this.uint(pointer, field, length))
      .idiv(new BigNumber(2).pow(length * 8 - significantBits))
      .toFixed(0);
  }
}
