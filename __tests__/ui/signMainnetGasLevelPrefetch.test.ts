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
  test('uses gas account at the selected level when gas account can pay it', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          fast: state({
            nativeNotEnough: true,
            gasAccount: [false, '<$0.0001'],
          }),
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
    ).toEqual({ level: 'fast', gasMethod: 'gasAccount' });
  });

  test('falls back to gas account normal when native and gas account cannot pay selected or lower levels', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          fast: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
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
    ).toEqual({ level: 'normal', gasMethod: 'gasAccount' });
  });

  test('downgrades to native slow before falling back to gas account', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          fast: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
          slow: state({
            nativeNotEnough: false,
            gasAccount: [true, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'slow', gasMethod: 'native' });
  });

  test('prefers gas account normal before native slow', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          fast: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
          slow: state({
            nativeNotEnough: false,
            gasAccount: [true, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [false, '<$0.0001'],
          }),
        },
      })
    ).toEqual({ level: 'normal', gasMethod: 'gasAccount' });
  });

  test('uses gas account slow when slow is selected and native cannot pay', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'slow',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          slow: state({
            nativeNotEnough: true,
            gasAccount: [false, '<$0.0001'],
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

  test('does not skip custom normal gas account fallback target to slow', () => {
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
    ).toEqual({ level: 'normal', gasMethod: 'gasAccount' });
  });

  test('uses gas account normal even when gas account balance is insufficient', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          fast: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
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
    ).toEqual({ level: 'normal', gasMethod: 'gasAccount' });
  });

  test('keeps the current level when gas account is unsupported', () => {
    expect(
      resolveSignMainnetAutoDowngradeGasLevel({
        selectedSupportedLevel: 'fast',
        gasAccountChainSupported: true,
        requestFingerprint: fingerprint,
        levelState: {
          fast: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
            gasAccountResult: {
              chain_not_support: true,
            } as any,
          }),
          slow: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
          }),
          normal: state({
            nativeNotEnough: true,
            gasAccount: [true, '<$0.0001'],
            gasAccountResult: {
              chain_not_support: true,
            } as any,
          }),
        },
      })
    ).toBeNull();
  });
});
