import { ethErrors } from 'eth-rpc-errors';
import {
  keyringService,
  notificationService,
  permissionService,
  preferenceService,
} from 'background/service';
import type { ApprovalRef } from '@/background/service/notification';
import type { Account } from '@/background/service/preference';
import {
  customTestnetService,
  TestnetChainBase,
} from '@/background/service/customTestnet';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';

const accountIdentity = (account?: Account | null) =>
  account && [account.address.toLowerCase(), account.type, account.brandName];

export const addCustomTestnetFromApproval = async (
  chain: TestnetChainBase,
  ref: ApprovalRef
) => {
  const approval = notificationService.getApproval();
  const values = { ...chain, id: +chain.id };
  const getContext = () => {
    const site = permissionService.getConnectedSite(
      approval?.data.origin || ''
    );
    return JSON.stringify([
      accountIdentity(preferenceService.getCurrentAccount()),
      preferenceService.getPreference('isEnabledDappAccount'),
      accountIdentity(site?.account),
      site?.chain,
      !!site,
    ]);
  };
  const context = getContext();
  let revoked = false;
  const checkContext = () => {
    revoked ||= getContext() !== context;
  };
  const checkLock = ({ isUnlocked }: { isUnlocked: boolean }) => {
    revoked ||= !isUnlocked;
  };
  const assertActiveApproval = () => {
    checkContext();
    if (
      revoked ||
      !keyringService.isUnlocked() ||
      !ref?.id ||
      !['AddChain', 'SwitchChain'].includes(ref.component) ||
      notificationService.getApproval() !== approval ||
      approval?.id !== ref.id ||
      approval.data.approvalComponent !== ref.component ||
      +approval.data.params?.data?.[0]?.chainId !== values.id
    ) {
      throw ethErrors.provider.userRejectedRequest(
        'The network approval is no longer current.'
      );
    }
  };
  assertActiveApproval();
  keyringService.memStore.subscribe(checkLock);
  eventBus.addEventListener(EVENTS.broadcastToUI, checkContext);
  try {
    // Recheck after RPC validation, immediately before any persistent write.
    return await customTestnetService.add(values, assertActiveApproval);
  } finally {
    keyringService.memStore.unsubscribe(checkLock);
    eventBus.removeEventListener(EVENTS.broadcastToUI, checkContext);
  }
};
