import { readFileSync } from 'fs';
import { resolve } from 'path';

// Run the component's handler without mounting camera/USB transports.
const source = readFileSync(
  resolve(
    __dirname,
    '../../src/ui/views/Approval/components/QRHardWareWaiting/QRHardWareWaiting.tsx'
  ),
  'utf8'
);
const handler = source.match(
  /const handleRetry = async \(\) => \{[\s\S]*?\n {2}\};/
)![0];

test.each([undefined, { flowId: 'flow', attemptId: 'retry' }])(
  'recovers the scanner with retry result %p',
  async (attempt) => {
    const wallet = {
      isApprovalCurrent: jest.fn().mockResolvedValue(true),
      resendSign: jest.fn().mockResolvedValue(attempt),
    };
    const initial = { flowId: 'flow', attemptId: 'pending' };
    const attemptRef = { current: initial };
    const notifySigningUiReady = jest.fn();
    const handleRequestSignature = jest.fn();
    const setStatus = jest.fn();
    const dependencies = {
      gnosisSubmission: { retry: async () => false },
      wallet,
      approvalScope: { approval: { approvalId: 'approval' } },
      getSigningContext: () => ({ signing: { attempt: initial } }),
      attemptRef,
      notifySigningUiReady,
      handleRequestSignature,
      setStatus,
      QRHARDWARE_STATUS: { SYNC: 'sync' },
    };
    const retry = new Function(
      ...Object.keys(dependencies),
      `${handler}; return handleRetry;`
    )(...Object.values(dependencies));
    await retry();
    expect(handleRequestSignature).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith('sync');
    expect(attemptRef.current).toBe(attempt || initial);
    expect(notifySigningUiReady).toHaveBeenCalledTimes(attempt ? 1 : 0);

    handleRequestSignature.mockClear();
    wallet.isApprovalCurrent
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await retry();
    expect(handleRequestSignature).not.toHaveBeenCalled();
  }
);
