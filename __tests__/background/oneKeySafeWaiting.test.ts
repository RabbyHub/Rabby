import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import { omit } from 'lodash';
import { ethErrors } from 'eth-rpc-errors';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import {
  createSigningOperation,
  waitSignComponentAmounted,
} from '@/utils/signEvent';
import {
  assertApprovalSigningBinding,
  signForWaitingApproval,
} from '@/background/controller/walletUtils/approvalSigning';

jest.mock('@/constant', () => ({
  EVENTS: {
    SIGN_WAITING_AMOUNTED: 'mounted',
    SIGN_FINISHED: 'finished',
    broadcastToUI: 'ui',
  },
}));

// Run both wallet entry points together, with real approval and event handling,
// without constructing unrelated network-backed services on the controller.
const file = resolve(__dirname, '../../src/background/controller/wallet.ts');
const source = ts.createSourceFile(
  file,
  readFileSync(file, 'utf8'),
  ts.ScriptTarget.Latest,
  true
);
const controller = source.statements
  .filter(ts.isClassDeclaration)
  .find((node) => node.name?.text === 'WalletController')!;
const methods = controller.members.filter((member) =>
  ['signTypedData', 'signTypedDataWithUI'].includes(
    member.name?.getText(source) || ''
  )
);
const compiled = ts.transpileModule(
  `new (class { ${methods
    .map((method) => method.getText(source))
    .join('\n')} })()`,
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } }
).outputText;

const type = 'Onekey Hardware';
const address = '0x1111111111111111111111111111111111111111';
const data = { domain: { chainId: 1 }, message: { nonce: 0 } };
const options = {
  version: 'V4',
  sourceApprovalId: 'review',
  approvalComponent: 'CommonWaiting',
  signingOperation: createSigningOperation({
    id: 'review',
    account: { type, address },
    origin: 'https://example.test',
    method: 'eth_signTypedData_v4',
    params: [address, JSON.stringify(data)],
  }),
};
const makeApproval = (id: string) => ({
  id,
  data: {
    account: { type, address },
    approvalComponent: 'CommonWaiting',
    params: {
      sourceApprovalId: options.sourceApprovalId,
      type,
      address,
      isGnosis: true,
      data: [address, JSON.stringify(data)],
      signingOperation: options.signingOperation,
    },
  },
});

describe('Safe owner signing on OneKey', () => {
  const deviceError = new Error('Rejected on device');
  const keyring = {};
  let current = makeApproval('waiting');
  const keyringService = {
    getKeyringForAccount: jest.fn(),
    signTypedMessage: jest.fn(),
  };
  const broadcast = jest.fn();
  const wallet = runInNewContext(compiled, {
    keyringService,
    notificationService: {
      getApproval: () => current,
      setCurrentRequestDeferFn: jest.fn(),
    },
    KEYRING_CLASS: { HARDWARE: { ONEKEY: type } },
    assertApprovalSigningBinding,
    signForWaitingApproval,
    waitSignComponentAmounted,
    omit,
    ethErrors,
    EVENTS,
    eventBus,
  });
  const start = () => wallet.signTypedDataWithUI(type, address, data, options);
  const mount = (id?: string) =>
    eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, id);
  const expectFinished = (result: Record<string, unknown>) => {
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenCalledWith({
      method: EVENTS.SIGN_FINISHED,
      params: {
        ...result,
        approvalId: 'waiting',
        signingOperation: options.signingOperation,
      },
    });
  };

  beforeEach(() => {
    current = makeApproval('waiting');
    jest.resetAllMocks();
    keyringService.getKeyringForAccount.mockResolvedValue(keyring);
    keyringService.signTypedMessage.mockResolvedValue('0xsignature');
    eventBus.addEventListener(EVENTS.broadcastToUI, broadcast);
  });
  afterEach(() => {
    eventBus.removeEventListener(EVENTS.broadcastToUI, broadcast);
    eventBus.removeAllEventListeners(EVENTS.SIGN_WAITING_AMOUNTED);
  });

  it('waits for the exact CommonWaiting mount and emits the result once with both identifiers', async () => {
    current = makeApproval(options.sourceApprovalId);
    const pending = start();
    mount(options.sourceApprovalId);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(keyringService.getKeyringForAccount).not.toHaveBeenCalled();

    current = makeApproval('waiting');
    mount();
    mount('other-window');
    // Let the deferred signing continuations run before the correct mount.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(keyringService.getKeyringForAccount).not.toHaveBeenCalled();
    mount('waiting');
    await expect(pending).resolves.toBe('0xsignature');
    expect(keyringService.signTypedMessage).toHaveBeenCalledTimes(1);
    expect(keyringService.signTypedMessage).toHaveBeenCalledWith(
      keyring,
      { from: address, data },
      { version: 'V4' }
    );
    expectFinished({ success: true, data: '0xsignature' });
  });

  it.each(['getKeyringForAccount', 'signTypedMessage'] as const)(
    'reports %s failure to the original waiting operation exactly once',
    async (method) => {
      keyringService[method].mockRejectedValueOnce(deviceError);
      const pending = start();
      mount('waiting');
      await expect(pending).rejects.toBe(deviceError);
      expectFinished({ success: false, errorMsg: deviceError.message });
    }
  );

  it('settles an obsolete wait when a different source opens its own approval', async () => {
    const pending = start();
    current = makeApproval('replacement');
    current.data.params.sourceApprovalId = 'next-review';
    mount('replacement');
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(keyringService.getKeyringForAccount).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('rejects a changed waiting ID during keyring lookup before invoking the device', async () => {
    keyringService.getKeyringForAccount.mockImplementationOnce(async () => {
      current = makeApproval('replacement');
      return keyring;
    });
    const pending = start();
    mount('waiting');
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(keyringService.signTypedMessage).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('suppresses a delayed device error after another waiting approval replaces the original', async () => {
    keyringService.signTypedMessage.mockImplementationOnce(async () => {
      current = makeApproval('replacement');
      throw deviceError;
    });
    const pending = start();
    mount('waiting');
    await expect(pending).rejects.toBe(deviceError);
    expect(broadcast).not.toHaveBeenCalled();
  });
});
