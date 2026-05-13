import { resolveSignMainnetAutoDowngradeGasLevel } from '@/ui/views/Approval/components/TxComponents/GasSelector/signMainnetGasLevelPrefetch';
import type { SignMainnetGasLevelState } from '@/ui/views/Approval/components/TxComponents/GasSelector/signMainnetGasLevelPrefetch';

const fingerprint = 'tx-1';

const state = (
  patch: SignMainnetGasLevelState['slow']
): NonNullable<SignMainnetGasLevelState['slow']> => ({
  fingerprint,
  nativeUsd: '<$0.0001',
  loading: false,
  ...patch,
});

describe('sign mainnet gas level prefetch', () => {
  test('prefers the closest gas account level before downgrading further', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: false,
            gasAccount: [false, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [false, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'normal', gasMethod: 'gasAccount' });
  });

  test('downgrades to native slow when gas account cannot pay any level', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: false,
            gasAccount: [true, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
          fast: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'slow', gasMethod: 'native' });
  });

  test('prefers native slow when both native and gas account can pay slow', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: false,
            gasAccount: [false, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'slow', gasMethod: 'native' });
  });

  test('downgrades to gas account slow when native cannot pay lower levels', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: true,
            gasAccount: [false, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'slow', gasMethod: 'gasAccount' });
  });

  test('downgrades from custom to normal when custom is above normal', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedGasPrice: 40,
        supportedGasLevels: [
          { level: 'slow', price: 10 },
          { level: 'normal', price: 30 },
          { level: 'fast', price: 50 },
        ],
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          normal: state({
            nativeNotEnough: false,
            gasAccount: [true, '<$0.0001'],
          }),
          slow: state({
            nativeNotEnough: false,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'normal', gasMethod: 'native' });
  });

  test('downgrades custom to slow when slow is the first lower level', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedGasPrice: 20,
        supportedGasLevels: [
          { level: 'slow', price: 10 },
          { level: 'normal', price: 30 },
          { level: 'fast', price: 50 },
        ],
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: false,
            gasAccount: [false, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'slow', gasMethod: 'native' });
  });

  test('downgrades custom to normal without using fast', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedGasPrice: 60,
        supportedGasLevels: [
          { level: 'slow', price: 10 },
          { level: 'normal', price: 30 },
          { level: 'fast', price: 50 },
        ],
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: false,
            gasAccount: [false, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [false, '<$0.0001'],
          }),
          fast: state({
            nativeNotEnough: false,
            gasAccount: [false, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'normal', gasMethod: 'gasAccount' });
  });

  test('does not skip custom normal downgrade target to slow', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedGasPrice: 60,
        supportedGasLevels: [
          { level: 'slow', price: 10 },
          { level: 'normal', price: 30 },
          { level: 'fast', price: 50 },
        ],
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: false,
            gasAccount: [false, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toBeNull();
  });

  test('keeps the current level when no native or gas account level can pay', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toBeNull();
  });
});
