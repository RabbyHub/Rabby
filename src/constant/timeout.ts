import { appIsDebugPkg, appIsDev } from '@/utils/env';

/**
 * When calling signatures, it is not possible to receive event messages in time, 
 if the UI has not been initialized
 */
export const SIGN_TIMEOUT = 100;

export const DEFT_BALANCE_LOADING_TIMEOUT_PROD = 10 * 60 * 1e3;
export const BALANCE_LOADING_TIMES = appIsDev
  ? {
      CHECK_INTERVAL: 2 * 1e3,
      TIMEOUT: 60 * 1e3,
      DELAY_AFTER_TX_COMPLETED: 1 * 60 * 1e3,
    }
  : appIsDebugPkg
  ? {
      CHECK_INTERVAL: 2 * 1e3,
      TIMEOUT: 90 * 1e3,
      DELAY_AFTER_TX_COMPLETED: 1 * 60 * 1e3,
    }
  : {
      CHECK_INTERVAL: 2 * 1e3,
      TIMEOUT: DEFT_BALANCE_LOADING_TIMEOUT_PROD,
      DELAY_AFTER_TX_COMPLETED: 5 * 60 * 1e3,
    };
