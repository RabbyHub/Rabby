import { signatureManager } from './SignatureManager';
import { typedDataSignatureManager } from './TypedDataSignatureManager';

export * from './types';
export { signatureManager, useSignatureStore } from './SignatureManager';
export {
  typedDataSignatureManager,
  useTypedDataSignatureStore,
  typedDataSignatureStore,
} from './TypedDataSignatureManager';
export const signatureStore = signatureManager;
