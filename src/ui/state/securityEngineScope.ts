/** Bind a risk acknowledgement to the evaluated request and action. */
export function getSecurityRuleKey(id: string, scope?: string): string {
  return scope === undefined ? id : `${JSON.stringify(scope)}:${id}`;
}

export function getProcessedRulesForScope(
  processedRules: string[],
  scope: string
): string[] {
  const prefix = getSecurityRuleKey('', scope);
  return processedRules
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}
