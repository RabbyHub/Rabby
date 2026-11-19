import { preferenceService } from 'background/service';

export const disableExtraFeeProtection = () => {
  preferenceService.setPreferencePartials({
    isExtraFeeProtectionEnabled: false,
  });
};

export const enableExtraFeeProtection = () => {
  preferenceService.setPreferencePartials({
    isExtraFeeProtectionEnabled: true,
  });
};
