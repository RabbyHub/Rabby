import { isManifestV3 } from '@/utils/env';
import preference from './preference';
import browser from 'webextension-polyfill';

const AUTO_LOCK_AT_KEY = 'autoLockAt';

class AutoLockService {
  timer: ReturnType<typeof setTimeout> | null = null;
  autoLockAt: number | null = null;

  onAutoLock?: () => void;

  constructor({ onAutoLock }: { onAutoLock?: () => void } = {}) {
    this.onAutoLock = onAutoLock;
  }

  async syncAutoLockAt() {
    if (!isManifestV3) return;
    const value = await browser.storage.session.get(AUTO_LOCK_AT_KEY);
    const autoLockAt = value[AUTO_LOCK_AT_KEY];
    if (autoLockAt) {
      if (Date.now() >= autoLockAt) {
        this.onAutoLock?.();
      } else {
        this.autoLockAt = autoLockAt;
        this.timer = setTimeout(
          () => this.onAutoLock?.(),
          autoLockAt - Date.now()
        );
      }
    }
  }

  async resetTimer() {
    const autoLockTime = preference.getPreference('autoLockTime');
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    if (!autoLockTime) {
      return;
    }
    const duration = autoLockTime * 60 * 1000;
    this.autoLockAt = Date.now() + duration;
    if (isManifestV3) {
      await browser.storage.session.set({
        [AUTO_LOCK_AT_KEY]: this.autoLockAt,
      });
    }
    this.timer = setTimeout(() => this.onAutoLock?.(), duration);
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
