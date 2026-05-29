export const shouldShowStakingPortfolio = ({
  backendIsHolding,
  hasActivePendingAction,
  hasPortfolioData,
  positionSummaryLoaded,
  positionSummaryError,
}: {
  backendIsHolding: boolean;
  hasActivePendingAction: boolean;
  hasPortfolioData: boolean;
  positionSummaryLoaded: boolean;
  positionSummaryError: boolean;
}) => {
  const hasConfirmedEmptySummary =
    positionSummaryLoaded && !positionSummaryError && !hasPortfolioData;

  return (
    hasActivePendingAction ||
    hasPortfolioData ||
    (backendIsHolding && !hasConfirmedEmptySummary)
  );
};
