import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import {
  biometricUnlockService,
  keyringService,
  preferenceService,
} from '@/background/service';
import { userGuideService } from '@/background/service/userGuide';
import { setPopupIcon } from '@/background/utils';

export const bootWallet = async (password) => {
  await keyringService.boot(password);
  // A new vault has a new password; a leftover record can't unlock it.
  biometricUnlockService.clear();
  userGuideService.destroy();

  const hasOtherProvider = preferenceService.getHasOtherProvider();
  const isDefaultWallet = preferenceService.getIsDefaultWallet();
  if (!hasOtherProvider) {
    setPopupIcon('default');
  } else {
    setPopupIcon(isDefaultWallet ? 'rabby' : 'metamask');
  }

  eventBus.emit(EVENTS.broadcastToUI, {
    method: EVENTS.WALLET_STATUS_CHANGED,
  });
};
