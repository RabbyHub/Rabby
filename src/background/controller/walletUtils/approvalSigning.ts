import type { Approval } from '@/background/service/notification';
import { ethErrors } from 'eth-rpc-errors';
import { isEqual } from 'lodash';

export interface ApprovalSigningBinding {
  sourceApprovalId?: string;
  approvalComponent?: Approval['data']['approvalComponent'];
}

type SigningRequest = {
  type: string;
  from: string;
  data: unknown;
  options?: ApprovalSigningBinding;
};

export const assertApprovalSigningBinding = (
  approval: Approval | null | undefined,
  { type, from, data, options }: SigningRequest
) => {
  if (
    options?.sourceApprovalId === undefined &&
    options?.approvalComponent === undefined
  ) {
    return;
  }

  const params = approval?.data.params;
  const sameAddress = (address: unknown) =>
    typeof address === 'string' &&
    !!from &&
    address.toLowerCase() === from.toLowerCase();
  let samePayload = false;
  try {
    const requestedData =
      typeof data === 'string'
        ? JSON.parse(data)
        : JSON.parse(JSON.stringify(data));
    samePayload = isEqual(JSON.parse(params?.data?.[1]), requestedData);
  } catch {
    // A malformed or absent waiting payload is never an authorization to sign.
  }

  if (
    !options?.sourceApprovalId ||
    !options?.approvalComponent ||
    approval?.data.approvalComponent !== options.approvalComponent ||
    params?.sourceApprovalId !== options.sourceApprovalId ||
    params?.isGnosis !== true ||
    params?.type !== type ||
    !sameAddress(params?.address) ||
    !sameAddress(params?.data?.[0]) ||
    approval?.data.account?.type !== type ||
    !sameAddress(approval?.data.account?.address) ||
    !samePayload
  ) {
    throw ethErrors.provider.userRejectedRequest(
      'The signing approval is no longer current.'
    );
  }
};

export const waitForApprovalSigning = async ({
  getApproval,
  waitForUI,
  ...request
}: SigningRequest & {
  getApproval: () => Approval | null | undefined;
  waitForUI: () => Promise<void>;
}) => {
  await waitForUI();
  assertApprovalSigningBinding(getApproval(), request);
};
