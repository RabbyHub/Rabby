import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';

/**
 * Signs a typed message as per EIP-712 and returns its sha3 hash
 *
 * @param {Object} typedData - Types message data to sign
 * @returns {Buffer} - sha3 hash of the resulting signed message
 */
export function signHashHex(typedData, useV4 = true): string {
  const sanitizedData = sigUtil.TypedDataUtils.sanitizeData(typedData);
  const parts = [Buffer.from('1901', 'hex')];
  parts.push(
    sigUtil.TypedDataUtils.hashStruct(
      'EIP712Domain',
      sanitizedData.domain,
      sanitizedData.types,
      useV4
    )
  );
  if (sanitizedData.primaryType !== 'EIP712Domain') {
    parts.push(
      sigUtil.TypedDataUtils.hashStruct(
        sanitizedData.primaryType as string,
        sanitizedData.message,
        sanitizedData.types,
        useV4
      )
    );
  }
  return ethUtil.bufferToHex(Buffer.concat(parts));
}
