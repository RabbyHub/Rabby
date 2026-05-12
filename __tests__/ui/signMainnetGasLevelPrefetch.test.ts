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

  test('downgrades from custom to a cheaper native level that can pay', () => {
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
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'slow', gasMethod: 'native' });
  });

  test('preserves the closest cheaper level when custom is above normal', () => {
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
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'normal', gasMethod: 'gasAccount' });
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
