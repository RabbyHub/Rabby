import { EventEmitter } from 'events';

const mockWindowEvents = new EventEmitter();
const mockOpenNotification = jest.fn();
const mockRemoveWindow = jest.fn();
const mockUpdateWindow = jest.fn();
const mockGetAll = jest.fn();

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: { getAll: mockGetAll, update: mockUpdateWindow },
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
  },
}));
jest.mock('consts', () => ({
  KEYRING_CATEGORY_MAP: {},
  IS_LINUX: false,
  IS_VIVALDI: false,
  IS_CHROME: false,
  KEYRING_CATEGORY: {},
  IS_WINDOWS: false,
}));
jest.mock('background/webapi', () => ({
  winMgr: {
    event: mockWindowEvents,
    openNotification: mockOpenNotification,
    remove: mockRemoveWindow,
  },
}));
jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: {
    addSigningTx: jest.fn(() => 'signing-tx-id'),
    getSigningTx: jest.fn(),
    removeSigningTx: jest.fn(),
    removeAllSigningTx: jest.fn(),
  },
}));
jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: { getCurrentAccount: jest.fn() },
}));
jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));
jest.mock('@/utils/chain', () => ({ findChain: jest.fn() }));
jest.mock('@/utils/env', () => ({ isManifestV3: true }));
jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

import notificationService from '@/background/service/notification';

const flushMicrotasks = async () => {
  for (let index = 0; index < 8; index++) await Promise.resolve();
};
let finishPendingOperations: (() => void)[];
const deferred = <T>(cleanupValue: T) => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  finishPendingOperations.push(() => resolve(cleanupValue));
  return { promise, resolve };
};
const requestTransaction = () => {
  const onRejected = jest.fn();
  const response = notificationService
    .requestApproval({
      approvalComponent: 'SignTx',
      origin: 'https://dapp.test',
      account: {
        address: '0xaccount',
        type: 'PrivateKey',
        brandName: 'PrivateKey',
      },
      params: { data: [{}] },
    })
    .catch((error) => {
      onRejected(error);
      return error;
    });
  return { response, onRejected, approval: notificationService.getApproval()! };
};
const completeFirstTransaction = async () => {
  const first = requestTransaction();
  await flushMicrotasks();
  expect(notificationService.notifiWindowId).toBe(1);
  expect(
    notificationService.resolveApprovalFor({
      approval: { id: first.approval.id, component: 'SignTx' },
      data: '0xfirst-transaction-hash',
    })
  ).toEqual({ accepted: true });
  await expect(first.response).resolves.toBe('0xfirst-transaction-hash');
  // rpcFlow's finally unlocks before the dApp receives the first result.
  notificationService.unLock();
  expect(notificationService.getApproval()).toBeNull();
};

describe('notification window lifecycle', () => {
  beforeEach(() => {
    finishPendingOperations = [];
    notificationService.approvals = [];
    notificationService.currentApproval = null;
    notificationService.notifiWindowId = null;
    notificationService.isLocked = false;
    notificationService.dappManager.clear();
    mockOpenNotification.mockReset().mockResolvedValue(1);
    mockRemoveWindow.mockReset().mockResolvedValue(undefined);
    mockUpdateWindow.mockReset().mockResolvedValue(undefined);
    mockGetAll.mockReset().mockResolvedValue([]);
  });

  afterEach(async () => {
    finishPendingOperations.forEach((finish) => finish());
    await flushMicrotasks();
  });

  test('keeps a second transaction that arrives after the old UI observed an empty queue', async () => {
    await completeFirstTransaction();
    // The old UI has already read null, but its close RPC has not arrived yet.
    const second = requestTransaction();

    await expect(notificationService.closeNotificationWindow(1)).resolves.toBe(
      false
    );

    expect(notificationService.notifiWindowId).toBe(1);
    expect(notificationService.getApproval()).toBe(second.approval);
    expect(notificationService.approvals).toEqual([second.approval]);
    expect(mockRemoveWindow).not.toHaveBeenCalled();
    expect(second.onRejected).not.toHaveBeenCalled();
  });

  test('opens a new window while the old close is pending and ignores its late removal', async () => {
    await completeFirstTransaction();
    const removal = deferred<void>(undefined);
    mockRemoveWindow.mockReturnValueOnce(removal.promise);
    const closing = notificationService.closeNotificationWindow(1);
    await flushMicrotasks();

    expect(mockRemoveWindow).toHaveBeenCalledWith(1);
    expect(notificationService.notifiWindowId).toBeNull();
    expect(notificationService.isLocked).toBe(false);
    mockOpenNotification.mockResolvedValueOnce(2);
    const second = requestTransaction();
    await flushMicrotasks();
    expect(notificationService.notifiWindowId).toBe(2);

    mockWindowEvents.emit('windowRemoved', 1, false);
    removal.resolve(undefined);
    await expect(closing).resolves.toBe(true);

    expect(notificationService.notifiWindowId).toBe(2);
    expect(notificationService.isLocked).toBe(true);
    expect(notificationService.getApproval()).toBe(second.approval);
    expect(second.onRejected).not.toHaveBeenCalled();
  });

  test('manual closure of the current window rejects the second transaction', async () => {
    await completeFirstTransaction();
    const second = requestTransaction();

    mockWindowEvents.emit('windowRemoved', 1, true);
    await expect(second.response).resolves.toMatchObject({ code: 4001 });

    expect(second.onRejected).toHaveBeenCalledTimes(1);
    expect(notificationService.notifiWindowId).toBeNull();
    expect(notificationService.getApproval()).toBeNull();
    expect(notificationService.approvals).toEqual([]);
    expect(mockOpenNotification).toHaveBeenCalledTimes(1);
  });

  test('an old window id cannot close or detach the new current window', async () => {
    mockOpenNotification.mockResolvedValueOnce(2);
    const second = requestTransaction();
    await flushMicrotasks();

    await expect(notificationService.closeNotificationWindow(1)).resolves.toBe(
      true
    );

    expect(mockRemoveWindow).not.toHaveBeenCalled();
    expect(notificationService.notifiWindowId).toBe(2);
    expect(notificationService.isLocked).toBe(true);
    expect(notificationService.getApproval()).toBe(second.approval);
    expect(second.onRejected).not.toHaveBeenCalled();
  });

  test('clear finishing after a new transaction opens cannot erase the new window', async () => {
    await completeFirstTransaction();
    const removal = deferred<void>(undefined);
    mockRemoveWindow.mockReturnValueOnce(removal.promise);
    const clearing = notificationService.clear();

    expect(notificationService.notifiWindowId).toBeNull();
    expect(notificationService.isLocked).toBe(false);
    mockOpenNotification.mockResolvedValueOnce(2);
    const second = requestTransaction();
    await flushMicrotasks();
    expect(notificationService.notifiWindowId).toBe(2);

    removal.resolve(undefined);
    await clearing;
    mockWindowEvents.emit('windowRemoved', 1, false);

    expect(notificationService.notifiWindowId).toBe(2);
    expect(notificationService.getApproval()).toBe(second.approval);
    expect(notificationService.approvals).toEqual([second.approval]);
    expect(second.onRejected).not.toHaveBeenCalled();
  });

  test('concurrent recovery attempts share the pending window creation', async () => {
    const creation = deferred<number>(1);
    mockOpenNotification.mockReturnValue(creation.promise);
    const transaction = requestTransaction();
    const recoveries = [
      notificationService.activeFirstApproval(),
      notificationService.activeFirstApproval(),
    ];
    await flushMicrotasks();

    expect(mockOpenNotification).toHaveBeenCalledTimes(1);
    creation.resolve(1);
    await Promise.all(recoveries);
    await flushMicrotasks();

    expect(notificationService.notifiWindowId).toBe(1);
    expect(notificationService.getApproval()).toBe(transaction.approval);
  });

  test('waits for window creation before closing its empty notification', async () => {
    const creation = deferred<number>(1);
    mockOpenNotification.mockReturnValueOnce(creation.promise);
    notificationService.openNotification({});
    const closing = notificationService.closeNotificationWindow(1);
    await flushMicrotasks();
    expect(mockRemoveWindow).not.toHaveBeenCalled();

    creation.resolve(1);
    await expect(closing).resolves.toBe(true);

    expect(mockRemoveWindow).toHaveBeenCalledWith(1);
    expect(notificationService.notifiWindowId).toBeNull();
    expect(notificationService.isLocked).toBe(false);
  });

  test('rechecks for new approvals after waiting for window creation', async () => {
    const creation = deferred<number>(1);
    mockOpenNotification.mockReturnValueOnce(creation.promise);
    notificationService.openNotification({});
    const closing = notificationService.closeNotificationWindow(1);
    const second = requestTransaction();
    creation.resolve(1);

    await expect(closing).resolves.toBe(false);

    expect(mockOpenNotification).toHaveBeenCalledTimes(1);
    expect(mockRemoveWindow).not.toHaveBeenCalled();
    expect(notificationService.notifiWindowId).toBe(1);
    expect(notificationService.getApproval()).toBe(second.approval);
  });
});
