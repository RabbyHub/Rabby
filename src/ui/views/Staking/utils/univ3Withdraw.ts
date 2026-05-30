export const isFullUniv3Withdraw = ({
  positionLiquidity,
  withdrawLiquidity,
}: {
  positionLiquidity?: string | bigint | null;
  withdrawLiquidity?: string | bigint | null;
}) => {
  try {
    const position = BigInt(positionLiquidity || 0);
    const withdraw = BigInt(withdrawLiquidity || 0);

    return position > 0n && withdraw === position;
  } catch {
    return false;
  }
};
