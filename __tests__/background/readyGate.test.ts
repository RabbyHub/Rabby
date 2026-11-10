import { createReadyGate } from '@/background/utils/readyGate';

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
});
