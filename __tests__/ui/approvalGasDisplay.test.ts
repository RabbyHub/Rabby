import {
  resolveApprovalGasLevelMethod,
  resolveApprovalGasMethod,
  shouldHideApprovalGasMethodTabs,
} from '@/ui/views/Approval/components/TxComponents/GasSelector/approvalGasDisplay';

describe('approval gas display method', () => {
  test('keeps gas method tabs visible while smart display is enabled', () => {
    expect(shouldHideApprovalGasMethodTabs()).toBe(false);
  });

  test('auto selects gas account when native gas is insufficient and gas account is usable', () => {
    expect(
      resolveApprovalGasMethod({
        nativeTokenInsufficient: true,
        gasAccountChainSupported: true,
        freeGasAvailable: false,
        noCustomRPC: true,
        isWalletConnect: false,
      })
    ).toBe('gasAccount');
  });

  test('manual gas method overrides the automatic result', () => {
    expect(
      resolveApprovalGasMethod({
        manualGasMethod: 'native',
        nativeTokenInsufficient: true,
        gasAccountChainSupported: true,
        freeGasAvailable: false,
        noCustomRPC: true,
        isWalletConnect: false,
      })
    ).toBe('native');

    expect(
      resolveApprovalGasLevelMethod({
        manualGasMethod: 'native',
        nativeTokenInsufficient: true,
        sharedGasAccountAvailable: true,
      })
    ).toBe('native');
  });
});
