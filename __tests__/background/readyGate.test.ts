import {
  createReadyGate,
  holdPortRequests,
} from '@/background/utils/readyGate';

describe('createReadyGate', () => {
  it('holds tasks until open, then runs them in order', async () => {
    const gate = createReadyGate();
    const calls: string[] = [];
    const first = gate.run(() => calls.push('first'));
    const second = gate.run(() => calls.push('second'));
    await Promise.resolve();
    expect(calls).toEqual([]);

    gate.open();
    await Promise.all([first, second]);
    expect(calls).toEqual(['first', 'second']);
  });

  it('runs synchronously once open, keeping sync results and throws', () => {
    const gate = createReadyGate();
    gate.open();
    expect(gate.isOpen).toBe(true);
    expect(gate.run(() => 42)).toBe(42);
    expect(() =>
      gate.run(() => {
        throw new Error('boom');
      })
    ).toThrow('boom');
  });

  it('rejects a held task that throws after open', async () => {
    const gate = createReadyGate();
    const held = gate.run(() => {
      throw new Error('late');
    });
    gate.open();
    await expect(held).rejects.toThrow('late');
  });

  it('rejects held and later tasks when it fails', async () => {
    const gate = createReadyGate();
    const task = jest.fn();
    const held = gate.run(task);
    gate.fail(new Error('restore failed'));
    await expect(held).rejects.toThrow('restore failed');
    await expect(gate.run(task)).rejects.toThrow('restore failed');
    expect(task).not.toHaveBeenCalled();
    expect(gate.isOpen).toBe(false);
  });

  describe('holdPortRequests', () => {
    const fakePort = () => {
      const listeners: (() => void)[] = [];
      return {
        onDisconnect: { addListener: (cb: () => void) => listeners.push(cb) },
        close: () => listeners.forEach((cb) => cb()),
      };
    };

    it('handles held requests in order once the gate opens', async () => {
      const gate = createReadyGate();
      const handle = jest.fn((n: number) => n * 2);
      const listen = holdPortRequests(gate, fakePort(), handle);
      const results = [listen(1), listen(2)];
      await Promise.resolve();
      expect(handle).not.toHaveBeenCalled();
      gate.open();
      expect(await Promise.all(results)).toEqual([2, 4]);
      expect(handle.mock.calls).toEqual([[1], [2]]);
    });

    it('drops a request held while its port closed', async () => {
      const gate = createReadyGate();
      const port = fakePort();
      const handle = jest.fn();
      const held = holdPortRequests(gate, port, handle)('setCurrentAccount');
      port.close();
      gate.open();
      await expect(held).rejects.toMatchObject({ code: 4900 });
      expect(handle).not.toHaveBeenCalled();
    });
  });
});
