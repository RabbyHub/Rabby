export type ApprovalRef<Component extends string = string> = Readonly<{
  approvalId: string;
  component: Component;
}>;

export const toApprovalRef = <Component extends string>(
  approvalId: string,
  component: Component
): ApprovalRef<Component> => ({ approvalId, component });

export type SigningResult = {
  success: boolean;
  data?: any;
  errorMsg?: string;
  errorStage?: 'hardware' | 'gnosis';
};

export type SigningRetry = {
  type: 'nonce' | 'gasPrice' | 'origin' | false;
  nonce?: string;
};
