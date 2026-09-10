export type ApprovalRef<Component extends string = string> = Readonly<{
  approvalId: string;
  component: Component;
}>;

export const toApprovalRef = <Component extends string>(
  approvalId: string,
  component: Component
): ApprovalRef<Component> => ({ approvalId, component });
