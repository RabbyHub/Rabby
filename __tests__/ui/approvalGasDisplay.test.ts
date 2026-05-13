import {
  isApprovalSmartGasDisplayEnabled,
  isGasAccountBalanceEnoughForDisplay,
  resolveApprovalDisplayedGasLevelNotEnough,
  resolveApprovalGasLevelMethod,
  resolveApprovalGasMethod,
  shouldAutoSwitchToApprovalGasAccount,
  shouldHideApprovalGasMethodTabs,
} from '@/ui/views/Approval/components/TxComponents/GasSelector/approvalGasDisplay';

describe('approval gas display method', () => {
  test('keeps manual gas method selection visible by default', () => {
    expect(isApprovalSmartGasDisplayEnabled()).toBe(false);
    expect(shouldHideApprovalGasMethodTabs()).toBe(false);
  });

  test('keeps the native-insufficient auto switch condition available', () => {
    expect(
      shouldAutoSwitchToApprovalGasAccount({
        nativeTokenInsufficient: true,
        gasAccountChainSupported: true,
        freeGasAvailable: false,
        noCustomRPC: true,
        isWalletConnect: false,
      })
    ).toBe(true);
  });

  test('uses the selected gas method in legacy mode', () => {
    expect(
      resolveApprovalGasMethod({
        legacyGasMethod: 'native',
        nativeTokenInsufficient: true,
        gasAccountChainSupported: true,
        freeGasAvailable: false,
        noCustomRPC: true,
        isWalletConnect: false,
      })
    ).toBe('native');

    expect(
      resolveApprovalGasLevelMethod({
        currentGasMethod: 'native',
        nativeTokenInsufficient: true,
        sharedGasAccountAvailable: true,
        isWalletConnect: false,
      })
    ).toBe('native');
  });

  test('still supports smart gas account resolution when explicitly requested', () => {
    expect(
      resolveApprovalGasMethod({
        mode: 'native_insufficient_prefers_gasAccount',
        legacyGasMethod: 'native',
        nativeTokenInsufficient: true,
        gasAccountChainSupported: true,
        freeGasAvailable: false,
        noCustomRPC: true,
        isWalletConnect: false,
      })
    ).toBe('gasAccount');
  });

  test('keeps insufficient native gas levels red when gas account is available', () => {
    expect(
      resolveApprovalDisplayedGasLevelNotEnough({
        isActive: false,
        displayMethod: 'native',
        nativeTokenInsufficient: true,
        gasAccountBalanceEnough: true,
        levelNativeInsufficient: true,
        sharedGasAccountAvailable: true,
      })
    ).toBe(true);

    expect(
      resolveApprovalDisplayedGasLevelNotEnough({
        isActive: false,
        displayMethod: 'gasAccount',
        nativeTokenInsufficient: true,
        gasAccountBalanceEnough: true,
        levelNativeInsufficient: true,
        sharedGasAccountAvailable: true,
      })
    ).toBe(false);
  });

  test('uses pending hardware gas account balance for display state', () => {
    expect(
      isGasAccountBalanceEnoughForDisplay({
        gasAccountCost: {
          balance_is_enough: false,
          chain_not_support: false,
          gas_account_cost: {
            total_cost: 0.15,
          },
        },
        pendingHardwareGasAccountBalance: 0.2,
      })
    ).toBe(true);
  });

  test('keeps gas account display insufficient when pending hardware balance is not enough', () => {
    expect(
      isGasAccountBalanceEnoughForDisplay({
        gasAccountCost: {
          balance_is_enough: false,
          chain_not_support: false,
          gas_account_cost: {
            estimate_tx_cost: 0.1,
            gas_cost: 0.05,
          },
        },
        pendingHardwareGasAccountBalance: 0.1,
      })
    ).toBe(false);
  });
});
