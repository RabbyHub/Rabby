import { typedDataSignatureManager } from './TypedDataSignatureManager';
export { registry, useRegistryInstances } from '../registry';

export * from './types';
export { signatureManager } from './SignatureManager';
export { shallowEqual, useSignatureStoreOf } from './useSignatureStore';
export {
  SignatureInstanceProvider,
  useSignatureInstance,
} from './SignatureInstanceContext';
export {
  typedDataSignatureManager,
  useTypedDataSignatureStore,
  typedDataSignatureStore,
} from './TypedDataSignatureManager';
