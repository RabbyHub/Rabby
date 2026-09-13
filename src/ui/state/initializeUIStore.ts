import { changeLanguage } from '@/i18n';
import { onBackgroundStoreChanged } from '../utils/broadcastToUI';
import { preferenceActions } from '@/ui/state/preference';

export const initializeUIStore = () => {
  onBackgroundStoreChanged('preference', (payload) => {
    switch (payload.changedKey) {
      case 'themeMode': {
        preferenceActions.setField({
          themeMode: payload.partials.themeMode,
        });
        break;
      }
      case 'locale': {
        const locale = payload.partials.locale;
        if (locale) {
          changeLanguage(locale);
          preferenceActions.setField({ locale });
        }
        break;
      }
      case 'rateGuideLastExposure': {
        preferenceActions.setField({
          rateGuideLastExposure: payload.partials.rateGuideLastExposure,
        });
        break;
      }
      case 'isEnabledPwdForNonWhitelistedTx': {
        preferenceActions.setField({
          isEnabledPwdForNonWhitelistedTx:
            payload.partials.isEnabledPwdForNonWhitelistedTx,
        });
        break;
      }
      case 'biometricUnlockEnabled': {
        preferenceActions.setField({
          biometricUnlockEnabled: payload.partials.biometricUnlockEnabled,
        });
        break;
      }
      case 'biometricUnlockCredentialId': {
        preferenceActions.setField({
          biometricUnlockCredentialId:
            payload.partials.biometricUnlockCredentialId,
        });
        break;
      }
      case 'biometricUnlockEncryptedPassword': {
        preferenceActions.setField({
          biometricUnlockEncryptedPassword:
            payload.partials.biometricUnlockEncryptedPassword,
        });
        break;
      }
      case 'biometricUnlockIv': {
        preferenceActions.setField({
          biometricUnlockIv: payload.partials.biometricUnlockIv,
        });
        break;
      }
      case 'unlockPreferredMethod': {
        preferenceActions.setField({
          unlockPreferredMethod: payload.partials.unlockPreferredMethod,
        });
        break;
      }
    }
  });
};
