export function makeAlianNameName({
  brandName,
  keyringCount = 1,
  keyringIndex = 0,
}: {
  brandName: string;
  keyringCount?: number;
  keyringIndex?: number;
}) {
  return `${brandName} ${keyringCount} #${(keyringIndex || 0) + 1}`;
}
