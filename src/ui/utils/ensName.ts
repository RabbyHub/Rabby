/** Accept domain-shaped names, including ENS-imported DNS names such as zk.money. */
export const isPossibleEnsName = (input: string) =>
  /^[^\s.]+(\.[^\s.]+)+$/.test(input.trim());
