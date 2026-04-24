export const getGasAccountEmptyStatePrimaryMode = ({
  isLogin,
  hasPendingHardwareAccount,
  hasEligibleGiftAddress,
}: {
  isLogin: boolean;
  hasPendingHardwareAccount: boolean;
  hasEligibleGiftAddress: boolean;
}) => {
  if (!isLogin && !hasPendingHardwareAccount && hasEligibleGiftAddress) {
    return 'claimGift' as const;
  }

  return 'deposit' as const;
};
