import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { getSecurityRuleKey } from '@/ui/state/securityEngineScope';

export type ActionSecurityGroup = {
  scope: string;
  results: Result[];
};

export function hasActionSecurityError(resultGroups: Result[][]): boolean {
  return resultGroups.some((results) =>
    results.some((result) => result.enable && result.level === Level.ERROR)
  );
}

export function getActionSecurityGate(
  groups: ActionSecurityGroup[],
  processedKeys: string[],
  mode: 'transaction' | 'typedData'
) {
  const processed = new Set(processedKeys);
  const pendingRuleKeys: string[] = [];
  const pendingLevels = new Set<Level>();
  let hasUnProcessSecurityResult = false;

  for (const { scope, results } of groups) {
    const enabled = results.filter((result) => result.enable);
    const pending = enabled.filter(
      (result) =>
        [Level.FORBIDDEN, Level.DANGER, Level.WARNING].includes(result.level) &&
        !processed.has(getSecurityRuleKey(result.id, scope))
    );
    for (const result of pending) {
      pendingRuleKeys.push(getSecurityRuleKey(result.id, scope));
      pendingLevels.add(result.level);
    }

    // A SAFE result can relax risks only in its own action. Preserve the
    // existing transaction rules that still require explicit confirmation.
    const hasSafe = enabled.some((result) => result.level === Level.SAFE);
    const trueDanger =
      mode === 'transaction' &&
      pending.some(
        (result) =>
          ['1016', '1019', '1020', '1021'].includes(result.id) &&
          result.level === Level.DANGER
      );
    if (trueDanger || (pending.length > 0 && !hasSafe)) {
      hasUnProcessSecurityResult = true;
    }
  }

  const securityLevel = [
    Level.FORBIDDEN,
    Level.DANGER,
    Level.WARNING,
  ].find((level) => pendingLevels.has(level));
  return {
    securityLevel,
    hasUnProcessSecurityResult,
    pendingRuleKeys,
  };
}
