import { signatureManager } from './SignatureManager';

export * from './types';
export { signatureManager, useSignatureStore } from './SignatureManager';
export const signatureStore = signatureManager;
