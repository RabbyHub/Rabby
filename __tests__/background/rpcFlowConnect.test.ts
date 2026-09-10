import 'reflect-metadata';

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
    windows: { update: jest.fn() },
    tabs: { onCreated: { addListener: jest.fn() } },
    runtime: { getManifest: () => ({ manifest_version: 3 }) },
    storage: { local: { get: jest.fn().mockResolvedValue({}) } },
  },
}));

jest.mock('background/service', () => ({
  get notificationService() {
    return jest.requireActual('@/background/service/notification').default;
  },
  get preferenceService() {
    return jest.requireActual('@/background/service/preference').default;
  },
  get signingFlowService() {
    return jest.requireActual('@/background/service/signingFlow')
      .signingFlowService;
  },
  keyringService: { memStore: { getState: () => ({ isUnlocked: true }) } },
  permissionService: {
    hasPermission: () => false,
    addConnectedSiteV2: jest.fn(),
  },
  sessionService: { broadcastEvent: jest.fn() },
}));
jest.mock('background/utils', () => ({
  PromiseFlow: jest.requireActual('@/background/utils/promiseFlow').default,
  underline2Camelcase: (value: string) =>
    value.replace(/_(.)/g, (_, char) => char.toUpperCase()),
}));
jest.mock('background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: { removeAllSigningTx: jest.fn() },
}));
jest.mock('@/background/controller/provider/controller', () => ({
  __esModule: true,
  default: {
    ethRequestAccounts: jest.fn(async ({ account }) => [account.address]),
  },
}));
jest.mock('@/background/controller/provider/gnosisController', () => ({}));
jest.mock('@/background/service/signTxPreparation', () => ({}));
jest.mock('@/utils/transaction', () => ({}));
jest.mock('@/utils', () => ({}));
jest.mock('@/utils/ga4', () => ({ ga4: { fireEvent: jest.fn() } }));
jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));
jest.mock('@sentry/browser', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

import rpcFlow from '@/background/controller/provider/rpcFlow';
import notificationService from '@/background/service/notification';
import preferenceService from '@/background/service/preference';
import { signingFlowService } from '@/background/service/signingFlow';
import transactionHistory from '@/background/service/transactionHistory';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

it.each([
  {
    name: 'same account',
    next: { address: '0xABC', type: 'Ledger', brandName: 'Ledger' },
    independent: false,
    cancelled: false,
  },
  {
    name: 'different address',
    next: { address: '0xdef', type: 'Ledger', brandName: 'Ledger' },
    independent: false,
    cancelled: true,
  },
  {
    name: 'different signer type',
    next: { address: '0xabc', type: 'Private Key', brandName: 'Rabby' },
    independent: false,
    cancelled: true,
  },
  {
    name: 'independent dapp account',
    next: { address: '0xdef', type: 'Ledger', brandName: 'Ledger' },
    independent: true,
    cancelled: false,
  },
])(
  'connects a new dapp with $name while another signature is pending',
  async ({ next, independent, cancelled }) => {
    const account = { address: '0xabc', type: 'Ledger', brandName: 'Ledger' };
    preferenceService.store = {
      currentAccount: account,
      isEnabledDappAccount: independent,
    } as any;
    notificationService.approvals = [];
    notificationService.currentApproval = null;
    notificationService.notifiWindowId = null;
    jest.mocked(transactionHistory.removeAllSigningTx).mockClear();
    const approve = jest
      .spyOn(notificationService, 'requestApproval')
      .mockResolvedValue({ defaultAccount: next, defaultChain: 'ETH' });
    // Background bootstrap routes actual account changes to session invalidation.
    const onAccountChange = () =>
      notificationService.invalidateApprovalSession();
    eventBus.addEventListener(EVENTS.ACCOUNT_WILL_CHANGE, onAccountChange);
    const flow = signingFlowService.createFlow({
      account,
      origin: 'https://original.test',
      rpcRequestId: 'mini',
    });
    const attempt = signingFlowService.createAttempt(flow, { awaitUi: false })!;
    let finish!: (signature: string) => void;
    const transport = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const owner = signingFlowService.run(flow, attempt, () => transport);
    const outcome = owner.then(
      (value) => ({ value }),
      (error) => ({ error })
    );
    try {
      await Promise.resolve();
      expect(signingFlowService.getFlow(flow)?.status).toBe('signing');
      await expect(
        rpcFlow({
          account,
          data: { method: 'eth_requestAccounts', params: [] },
          session: { origin: 'https://new.test', name: 'new' },
        } as any)
      ).resolves.toEqual([next.address]);
      expect(approve).toHaveBeenCalledWith(
        expect.objectContaining({ approvalComponent: 'Connect' }),
        expect.anything()
      );
      if (cancelled) {
        await expect(outcome).resolves.toMatchObject({ error: { code: 4001 } });
        expect(signingFlowService.getFlow(flow)).toBeUndefined();
      } else {
        expect(signingFlowService.getFlow(flow)?.status).toBe('signing');
        expect(transactionHistory.removeAllSigningTx).not.toHaveBeenCalled();
        finish('signature');
        await expect(outcome).resolves.toEqual({ value: 'signature' });
      }
    } finally {
      signingFlowService.cancelFlow(flow);
      finish('late');
      await outcome;
      approve.mockRestore();
      eventBus.removeEventListener(EVENTS.ACCOUNT_WILL_CHANGE, onAccountChange);
    }
  }
);
