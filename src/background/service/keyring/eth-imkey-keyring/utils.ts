import { bytesToHex } from '@ethereumjs/util';
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';

/**
 * Signs a typed message as per EIP-712 and returns its sha3 hash
 *
 * @param {Object} typedData - Types message data to sign
 * @returns {Buffer} - sha3 hash of the resulting signed message
 */
export function signHashHex(typedData, useV4 = true): string {
  const sanitizedData = TypedDataUtils.sanitizeData(typedData);
  const parts = [Buffer.from('1901', 'hex')];
  parts.push(
    TypedDataUtils.hashStruct(
      'EIP712Domain',
      sanitizedData.domain,
      sanitizedData.types,
      useV4 ? SignTypedDataVersion.V4 : SignTypedDataVersion.V3
    )
  );
  if (sanitizedData.primaryType !== 'EIP712Domain') {
    parts.push(
      TypedDataUtils.hashStruct(
        sanitizedData.primaryType as string,
        sanitizedData.message,
        sanitizedData.types,
        useV4 ? SignTypedDataVersion.V4 : SignTypedDataVersion.V3
      )
    );
  }
  return bytesToHex(Buffer.concat(parts));
}
