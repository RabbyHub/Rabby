import * as Sentry from '@sentry/browser';
import {
  InvalidBridgeContractError,
  toBridgeErrorReport,
} from '@rabby-wallet/rabby-bridge';
import type { BridgeErrorReport } from '@rabby-wallet/rabby-bridge';

export const createBridgeSdkSentryEvent = (value: unknown) => {
  const report = toBridgeErrorReport(value);
  if (!report) return null;

  const primary = report.errors[0];
  const tags: Record<string, string> = {
    bridge_sdk: 'validation',
    bridge_error_code: report.error_code,
    bridge_stage: report.stage,
  };
  Object.entries({
    bridge_aggregator: primary.aggregatorId,
    bridge_chain: primary.chainId,
    bridge_id: primary.bridgeId,
    bridge_operation: primary.operation,
    bridge_blocking: primary.blocking,
  }).forEach(([key, value]) => {
    if (value !== undefined) tags[key] = String(value);
  });

  return {
    type: undefined,
    message: 'bridge SDK validation failed',
    level: 'warning' as const,
    tags,
    fingerprint: [
      'bridge-sdk-validation',
      report.error_code,
      primary.aggregatorId || 'unknown',
      primary.method || 'unknown',
    ],
    extra: { bridge_sdk_report: report },
  };
};

export const reportBridgeSdkError = (report: BridgeErrorReport) => {
  try {
    const event = createBridgeSdkSentryEvent(report);
    if (event) {
      // beforeSend rebuilds the payload after Sentry's default depth normalization.
      Sentry.captureEvent(event, {
        data: { bridge_sdk_report: event.extra.bridge_sdk_report },
      });
    }
  } catch {
    // Reporting must not change whether the transaction is accepted.
  }
};

export const reportBridgeSdkException = (error: unknown) => {
  // Calldata failures already reached onError before the SDK threw them.
  if (error instanceof InvalidBridgeContractError) {
    reportBridgeSdkError(error.toJSON());
  }
};
