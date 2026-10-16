export const WALLETCONNECT_CLOCK_SKEW = 'WALLETCONNECT_CLOCK_SKEW';

export const isWalletConnectClockSkewError = (error: unknown): boolean => {
  const message =
    typeof error === 'string'
      ? error
      : (error as { message?: unknown } | null)?.message;

  return (
    typeof message === 'string' &&
    /WebSocket connection closed abnormally with code: 3000 \((?:Authorization error: )?JWT validation error: JWT Token is not yet valid:/.test(
      message
    )
  );
};
