import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as uuid from 'uuid';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import { KeystoneWiredWaiting } from '@/ui/views/Approval/components/QRHardWareWaiting/KeystoneWaiting/KeystoneWiredWaiting';

const mockWallet = { requestKeyring: jest.fn() };
const mockPopupProps: { current: any } = { current: null };

jest.mock('ui/utils', () => ({
  useWallet: () => mockWallet,
  openInternalPageInTab: jest.fn(),
  useCommonPopupView: () => ({ setHeight: jest.fn() }),
}));
jest.mock('@/constant', () => ({
  HARDWARE_KEYRING_TYPES: { Keystone: { type: 'KeystoneKeyring' } },
}));
jest.mock('@/ui/utils/keystone', () => ({
  useKeystoneUSBErrorMessage: () => (e: Error) => e.message,
}));
const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
  Trans: ({ children }: any) => children,
}));
jest.mock(
  '@/ui/views/Approval/components/Popup/ApprovalPopupContainer',
  () => ({
    ApprovalPopupContainer: (props: any) => {
      mockPopupProps.current = props;
      return null;
    },
  })
);

const REQUEST_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const OTHER_REQUEST_ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

const signatureResponse = (requestId: string) => {
  const sig = new ETHSignature(
    Buffer.alloc(65, 7),
    Buffer.from(uuid.parse(requestId) as Uint8Array)
  );
  // bc-ur-registry-eth bundles its own bc-ur copy; rebuild the UR with ours.
  const registryUR = sig.toUR();
  const ur = new UR(registryUR.cbor, registryUR.type);
  return {
    payload: new UREncoder(ur, 1000).nextPart(),
    cborHex: ur.cbor.toString('hex'),
  };
};

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

describe('KeystoneWiredWaiting', () => {
  let container: HTMLDivElement;
  let root: Root;
  const baseProps = () => ({
    payload: { type: 'eth-sign-request', cbor: 'a1' },
    requestId: REQUEST_ID,
    isDone: false,
    onDone: jest.fn(),
    errorMessage: '',
    setErrorMessage: jest.fn(),
    handleSuccess: jest.fn(),
    onRetry: jest.fn(async () => undefined),
    handleCancel: jest.fn(),
    setHiddenSwitchButton: jest.fn(),
  });
  const render = (props: ReturnType<typeof baseProps>) =>
    act(() => root.render(React.createElement(KeystoneWiredWaiting, props)));

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('submits a matching signature exactly once, even across later re-renders', async () => {
    const { payload, cborHex } = signatureResponse(REQUEST_ID);
    mockWallet.requestKeyring.mockResolvedValue({ payload });
    const props = baseProps();

    render(props);
    await flush();
    expect(props.handleSuccess).toHaveBeenCalledTimes(1);
    expect(props.handleSuccess).toHaveBeenCalledWith(cborHex);

    // The old render-time decoder re-submitted when the parent toggled errorMessage.
    render({ ...props, errorMessage: 'transient' });
    await flush();
    render({ ...props, errorMessage: '' });
    await flush();
    expect(props.handleSuccess).toHaveBeenCalledTimes(1);
  });

  it('rejects a signature for a different request id', async () => {
    const { payload } = signatureResponse(OTHER_REQUEST_ID);
    mockWallet.requestKeyring.mockResolvedValue({ payload });
    const props = baseProps();

    render(props);
    await flush();
    expect(props.handleSuccess).not.toHaveBeenCalled();
    expect(props.setErrorMessage).toHaveBeenCalledWith(
      'page.signFooterBar.keystone.misMatchSignId'
    );
  });

  it('does not submit while an error message is shown', async () => {
    const { payload } = signatureResponse(REQUEST_ID);
    mockWallet.requestKeyring.mockResolvedValue({ payload });
    const props = { ...baseProps(), errorMessage: 'failed' };

    render(props);
    await flush();
    expect(props.handleSuccess).not.toHaveBeenCalled();
    expect(mockPopupProps.current.status).toBe('REJECTED');
  });

  it('auto-retries a transient USB error once and shows WAITING meanwhile', async () => {
    mockWallet.requestKeyring.mockRejectedValueOnce(
      new Error('state is in progress.')
    );
    mockWallet.requestKeyring.mockReturnValue(new Promise(() => undefined));
    const props = baseProps();

    render(props);
    await flush();
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(mockWallet.requestKeyring).toHaveBeenCalledTimes(2);
    expect(mockPopupProps.current.status).toBe('WAITING');
    expect(props.handleSuccess).not.toHaveBeenCalled();
  });
});
