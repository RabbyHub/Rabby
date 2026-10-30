import { keyringService, preferenceService } from 'background/service';

// Turning protection off is password-gated here, not only in the UI modal,
// so no caller of the wallet controller can skip the check.
export const disableExtraFeeProtection = async (password: string) => {
  await keyringService.verifyPassword(password);
  preferenceService.setPreferencePartials({
    isExtraFeeProtectionEnabled: false,
  });
};

export const enableExtraFeeProtection = () => {
  preferenceService.setPreferencePartials({
    isExtraFeeProtectionEnabled: true,
  });
};
