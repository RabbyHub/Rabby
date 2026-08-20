import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { keyringService, preferenceService } from '@/background/service';
import { userGuideService } from '@/background/service/userGuide';
import { bootWallet } from '@/background/controller/walletUtils/boot';
import { setPopupIcon } from '@/background/utils';

jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    onCreated: {
      addListener: jest.fn(),
    },
  },
}));

jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: {
    emit: jest.fn(),
  },
}));

jest.mock('@/background/service', () => ({
  keyringService: {
    boot: jest.fn(),
  },
  preferenceService: {
    getHasOtherProvider: jest.fn(),
    getIsDefaultWallet: jest.fn(),
  },
}));

jest.mock('@/background/service/userGuide', () => ({
  userGuideService: {
    destroy: jest.fn(),
  },
}));

jest.mock('@/background/utils', () => ({
  setPopupIcon: jest.fn(),
}));

describe('bootWallet', () => {
  test('broadcasts a status refresh without signaling local unlock consent', async () => {
    (keyringService.boot as jest.Mock).mockResolvedValue(undefined);
    (preferenceService.getHasOtherProvider as jest.Mock).mockReturnValue(false);

    await bootWallet('password');

    expect(keyringService.boot).toHaveBeenCalledWith('password');
    expect(userGuideService.destroy).toHaveBeenCalledTimes(1);
    expect(setPopupIcon).toHaveBeenCalledWith('default');
    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.broadcastToUI, {
      method: EVENTS.WALLET_STATUS_CHANGED,
    });
    expect(eventBus.emit).not.toHaveBeenCalledWith(
      EVENTS.broadcastToUI,
      expect.objectContaining({ method: EVENTS.UNLOCK_WALLET })
    );
  });
});
