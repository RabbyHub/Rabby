import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/browser';

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}
