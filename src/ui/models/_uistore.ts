import { RabbyDispatch } from '@/ui/models';
import { changeLanguage } from '@/i18n';
import { onBackgroundStoreChanged } from '../utils/broadcastToUI';
import { useAccountStore } from '@/ui/state/account';

export default (store: typeof import('@/ui/store').default) => {
  const dispatch = store.dispatch as RabbyDispatch;

  onBackgroundStoreChanged('contactBook', (payload) => {
    const currentAccount = useAccountStore.getState().currentAccount;
    const currentAddr = currentAccount?.address;

    if (currentAddr && payload.partials[currentAddr]) {
      const aliasName = payload.partials[currentAddr]!.name;
      useAccountStore.getState().setField({
        alianName: aliasName,
        currentAccount: { ...currentAccount, alianName: aliasName },
      });
    }
  });

  onBackgroundStoreChanged('preference', (payload) => {
    // const state = store.getState() as RabbyRootState;
    // const preference = state.preference;

    switch (payload.changedKey) {
      case 'themeMode': {
        dispatch.preference.setField({
          themeMode: payload.partials.themeMode,
        });
        break;
      }
      case 'locale': {
        const locale = payload.partials.locale;
        if (locale) {
          changeLanguage(locale);
          dispatch.preference.setField({ locale });
        }
        break;
      }
      case 'rateGuideLastExposure': {
        dispatch.preference.setField({
          rateGuideLastExposure: payload.partials.rateGuideLastExposure,
        });
        break;
      }
      case 'isEnabledPwdForNonWhitelistedTx': {
        dispatch.preference.setField({
          isEnabledPwdForNonWhitelistedTx:
            payload.partials.isEnabledPwdForNonWhitelistedTx,
        });
        break;
      }
      case 'biometricUnlockEnabled': {
        dispatch.preference.setField({
          biometricUnlockEnabled: payload.partials.biometricUnlockEnabled,
        });
        break;
      }
      case 'biometricUnlockCredentialId': {
        dispatch.preference.setField({
          biometricUnlockCredentialId:
            payload.partials.biometricUnlockCredentialId,
        });
        break;
      }
      case 'biometricUnlockEncryptedPassword': {
        dispatch.preference.setField({
          biometricUnlockEncryptedPassword:
            payload.partials.biometricUnlockEncryptedPassword,
        });
        break;
      }
      case 'biometricUnlockIv': {
        dispatch.preference.setField({
          biometricUnlockIv: payload.partials.biometricUnlockIv,
        });
        break;
      }
      case 'unlockPreferredMethod': {
        dispatch.preference.setField({
          unlockPreferredMethod: payload.partials.unlockPreferredMethod,
        });
        break;
      }
    }
  });
};
