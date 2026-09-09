export const isApprovalProcessDisabled = ({
  securityBlocked,
  hasUnprocessedSecurityResult,
  payGasByGasAccount,
  gasAccountCanPay,
  useGasLess,
  disabledProcess,
}: {
  securityBlocked: boolean;
  hasUnprocessedSecurityResult: boolean;
  payGasByGasAccount: boolean;
  gasAccountCanPay?: boolean;
  useGasLess: boolean;
  disabledProcess: boolean;
}) => {
  // An alternate gas payment method can only clear a gas-related block.
  if (securityBlocked || hasUnprocessedSecurityResult) return true;
  if (payGasByGasAccount) return !gasAccountCanPay;
  return useGasLess ? false : disabledProcess;
};
