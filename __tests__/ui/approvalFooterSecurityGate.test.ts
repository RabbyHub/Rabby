import { isApprovalProcessDisabled } from '@/ui/views/Approval/components/FooterBar/securityGate';

const paymentMethods = [
  { useGasLess: false, payGasByGasAccount: false },
  { useGasLess: true, payGasByGasAccount: false },
  { useGasLess: false, payGasByGasAccount: true },
  { useGasLess: true, payGasByGasAccount: true },
];

describe('approval footer security gate', () => {
  test.each(paymentMethods)(
    'preserves pending/error/risk blocks with payment method %j',
    (paymentMethod) => {
      const input = {
        ...paymentMethod,
        gasAccountCanPay: true,
        disabledProcess: false,
      };
      expect(
        isApprovalProcessDisabled({
          ...input,
          securityBlocked: true,
          hasUnprocessedSecurityResult: false,
        })
      ).toBe(true);
      expect(
        isApprovalProcessDisabled({
          ...input,
          securityBlocked: false,
          hasUnprocessedSecurityResult: true,
        })
      ).toBe(true);
    }
  );

  test('still permits sponsored gas to clear insufficient-native-gas blocks after security passes', () => {
    const input = {
      securityBlocked: false,
      hasUnprocessedSecurityResult: false,
      disabledProcess: true,
    };
    expect(
      isApprovalProcessDisabled({
        ...input,
        useGasLess: true,
        payGasByGasAccount: false,
      })
    ).toBe(false);
    expect(
      isApprovalProcessDisabled({
        ...input,
        useGasLess: false,
        payGasByGasAccount: true,
        gasAccountCanPay: true,
      })
    ).toBe(false);
    expect(
      isApprovalProcessDisabled({
        ...input,
        useGasLess: false,
        payGasByGasAccount: true,
        gasAccountCanPay: false,
      })
    ).toBe(true);
  });
});
