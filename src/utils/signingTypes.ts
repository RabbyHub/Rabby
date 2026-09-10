export type ApprovalRef<Component extends string = string> = Readonly<{
  approvalId: string;
  component: Component;
}>;

export const toApprovalRef = <Component extends string>(
  approvalId: string,
  component: Component
): ApprovalRef<Component> => ({ approvalId, component });

// Correlates one execution (including a retry), independently of user consent.
export type SigningEvent = {
  executionId: string;
  success?: boolean;
  data?: any;
  errorMsg?: string;
};

export type SigningRetry = {
  type: 'nonce' | 'gasPrice' | 'origin' | false;
  nonce?: string;
};
