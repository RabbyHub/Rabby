import preference from './preference';

class AutoLockService {
  timer: ReturnType<typeof setTimeout> | null = null;

  onAutoLock?: () => void;

  constructor({ onAutoLock }: { onAutoLock?: () => void } = {}) {
    this.onAutoLock = onAutoLock;
    // this.setLastActiveTime();
  }

  resetTimer() {
    const autoLockTime = preference.getPreference('autoLockTime');
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (!autoLockTime) {
      return;
    }
    this.timer = setTimeout(
      () => this.onAutoLock?.(),
      autoLockTime * 60 * 1000
    );
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
