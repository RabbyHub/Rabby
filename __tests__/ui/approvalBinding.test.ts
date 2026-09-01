import { getApprovalTarget } from '@/ui/utils/approval-context';

const approval = (id: string, component = 'SignTx') =>
  ({ id, data: { approvalComponent: component } } as any);

describe('getApprovalTarget', () => {
  it('binds to the approval the page was mounted for', () => {
    const binding = { id: 'a', component: 'SignTx' } as any;
    expect(getApprovalTarget(approval('a'), binding)).toEqual({
      id: 'a',
      isStale: false,
    });
  });

  it('marks the action stale when the queue moved on', () => {
    const binding = { id: 'a', component: 'SignTx' } as any;
    expect(getApprovalTarget(approval('b'), binding).isStale).toBe(true);
    expect(getApprovalTarget(null, binding).isStale).toBe(true);
    expect(getApprovalTarget(approval('a', 'SignText'), binding).isStale).toBe(
      true
    );
  });

  it('requires an explicit id and the binding to agree', () => {
    const binding = { id: 'a', component: 'SignTx' } as any;
    expect(getApprovalTarget(approval('b'), binding, 'b')).toEqual({
      id: 'b',
      isStale: true,
    });
    expect(getApprovalTarget(approval('b'), null, 'b')).toEqual({
      id: 'b',
      isStale: false,
    });
  });

  it('leaves unbound callers unchanged', () => {
    expect(getApprovalTarget(approval('a'), null)).toEqual({
      id: undefined,
      isStale: false,
    });
  });
});
