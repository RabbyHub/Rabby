type SeedPhraseAccountLike = {
  balance?: number | string | null;
};

type SeedPhraseGroupLike = {
  list: SeedPhraseAccountLike[];
  index?: number | null;
};

export const getSeedPhraseGroupTotalBalance = (group: SeedPhraseGroupLike) => {
  return group.list.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );
};

export const sortSeedPhraseGroups = <T extends SeedPhraseGroupLike>(
  groups: T[]
) => {
  return [...groups].sort((a, b) => {
    const balanceDiff =
      getSeedPhraseGroupTotalBalance(b) - getSeedPhraseGroupTotalBalance(a);

    if (balanceDiff !== 0) {
      return balanceDiff;
    }

    const accountCountDiff = b.list.length - a.list.length;
    if (accountCountDiff !== 0) {
      return accountCountDiff;
    }

    return (b.index || 0) - (a.index || 0);
  });
};
