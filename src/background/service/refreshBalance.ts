import { isManifestV3 } from '@/utils/env';
import browser from 'webextension-polyfill';
import { ALARMS_REFRESH_BALANCE } from '../utils/alarms';
import { millisecondsToMinutes, miniutesToMilliseconds } from '@/utils/time';
import { BALANCE_LOADING_TIMES } from '@/constant/timeout';

const balanceRefreshSchedule = millisecondsToMinutes(
  BALANCE_LOADING_TIMES.DELAY_AFTER_TX_COMPLETED
);
class RefreshBalanceService {
  timer: ReturnType<typeof setTimeout> | null = null;

  onRefreshBalance?: (ctx?: { accountToRefresh?: string }) => void;
  private _accountToRefresh?: string;

  get accountToRefresh() {
    return this._accountToRefresh;
  }

  resetTimer(accountToRefresh?: string) {
    this._accountToRefresh = accountToRefresh;

    if (this.timer) {
      clearTimeout(this.timer);
    } else if (isManifestV3) {
      browser.alarms.clear(ALARMS_REFRESH_BALANCE);
    }
    if (!balanceRefreshSchedule) {
      return;
    }
    if (isManifestV3) {
      browser.alarms.create(ALARMS_REFRESH_BALANCE, {
        delayInMinutes: balanceRefreshSchedule,
        periodInMinutes: balanceRefreshSchedule,
      });
      browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === ALARMS_REFRESH_BALANCE) {
          this.onRefreshBalance?.();
          browser.alarms.clear(ALARMS_REFRESH_BALANCE);
        }
      });
    } else {
      this.timer = setTimeout(
        () => this.onRefreshBalance?.(),
        BALANCE_LOADING_TIMES.DELAY_AFTER_TX_COMPLETED
      );
    }
  }
}

export const refreshBalanceService = new RefreshBalanceService();
