import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { keyringService, preferenceService } from '@/background/service';
import { userGuideService } from '@/background/service/userGuide';
import { setPopupIcon } from '@/background/utils';

export const bootWallet = async (password) => {
  await keyringService.boot(password);
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
