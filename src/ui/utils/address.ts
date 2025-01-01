export const ellipsis = (text: string) => {
  return text.toString().replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

export const ellipsisAddress = ellipsis;

export const enum AddressType {
  EOA = 'EOA',
  CONTRACT = 'CONTRACT',
  UNKNOWN = 'UNKNOWN',
}

export type Hex = `0x${string}`;

export function add0x(hexadecimal: string): Hex {
  if (hexadecimal.startsWith('0x')) {
    return hexadecimal as Hex;
  }

  if (hexadecimal.startsWith('0X')) {
    return `0x${hexadecimal.substring(2)}`;
  }

  return `0x${hexadecimal}`;
}

export function isStrictHexString(value: unknown): value is Hex {
  if (typeof value === 'string') {
    return /^0x[0-9a-f]+$/iu.test(value);
  }
  return false;
}
