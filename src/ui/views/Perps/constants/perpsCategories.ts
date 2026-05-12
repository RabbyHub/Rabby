export type PerpsCategoryId = string;

export type PerpsCategoryConfig = {
  id: PerpsCategoryId;
  /** Already translated display text (resolved by the hook). */
  label: string;
  homeLimit: number | null;
  showRankOnHome: boolean;
  showRankOnSearch: boolean;
};
