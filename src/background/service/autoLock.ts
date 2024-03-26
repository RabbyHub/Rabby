import { isManifestV3 } from '@/utils/env';
import preference from './preference';
import browser from 'webextension-polyfill';
import { ALARMS_AUTO_LOCK } from '../utils/alarms';

class AutoLockService {
  timer: ReturnType<typeof setTimeout> | null = null;

  onAutoLock?: () => void;

  constructor({ onAutoLock }: { onAutoLock?: () => void } = {}) {
    this.onAutoLock = onAutoLock;
  }

  resetTimer() {
    const autoLockTime = preference.getPreference('autoLockTime');
    if (this.timer) {
      clearTimeout(this.timer);
    } else if (isManifestV3) {
      browser.alarms.clear(ALARMS_AUTO_LOCK);
    }
    if (!autoLockTime) {
      return;
    }
    if (isManifestV3) {
      browser.alarms.create(ALARMS_AUTO_LOCK, {
        delayInMinutes: autoLockTime,
        periodInMinutes: autoLockTime,
      });
      browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === ALARMS_AUTO_LOCK) {
          this.onAutoLock?.();
          browser.alarms.clear(ALARMS_AUTO_LOCK);
        }
      });
    } else {
      this.timer = setTimeout(
        () => this.onAutoLock?.(),
        autoLockTime * 60 * 1000
      );
    }
  }

  setLastActiveTime() {
    this.resetTimer();
  }

  setAutoLockTime(autoLockTime: number) {
    preference.setAutoLockTime(autoLockTime);
    this.resetTimer();
  }
}

export const autoLockService = new AutoLockService();
