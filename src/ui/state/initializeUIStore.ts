import { changeLanguage } from '@/i18n';
import { onBackgroundStoreChanged } from '../utils/broadcastToUI';
import { useAccountStore } from '@/ui/state/account';
import { useContactBookStore } from '@/ui/state/contactBook';
import { preferenceActions } from '@/ui/state/preference';

export const initializeUIStore = () => {
  const syncCurrentAccountAlias = () => {
    const currentAccount = useAccountStore.getState().currentAccount;
    if (!currentAccount?.address) return;

    const contact = useContactBookStore.getState()[
      currentAccount.address.toLowerCase()
    ];
    const aliasName = contact?.isAlias ? contact.name : '';
    const accountState = useAccountStore.getState();
    if (
      accountState.alianName === aliasName &&
      (currentAccount.alianName || '') === aliasName
    ) {
      return;
    }

    accountState.setField({
      alianName: aliasName,
      currentAccount: { ...currentAccount, alianName: aliasName },
    });
  };

  useContactBookStore.subscribe(syncCurrentAccountAlias);
  useAccountStore.subscribe((state, previousState) => {
    if (
      state.currentAccount?.address !== previousState.currentAccount?.address
    ) {
      syncCurrentAccountAlias();
    }
  });
  if (useContactBookStore.persist.hasHydrated()) {
    syncCurrentAccountAlias();
  }

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
