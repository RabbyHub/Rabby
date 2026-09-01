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

  it('lets an explicit id override the page it was mounted for', () => {
    // a flow that moves onto an approval it just created names it; the page's
    // own binding is only the default for callers that name nothing
    const binding = { id: 'a', component: 'SignTx' } as any;
    expect(getApprovalTarget(approval('b'), binding, 'b')).toEqual({
      id: 'b',
      isStale: false,
    });
    expect(getApprovalTarget(approval('b'), null, 'b')).toEqual({
      id: 'b',
      isStale: false,
    });
  });

  it('still checks an explicit id against the live approval', () => {
    expect(getApprovalTarget(approval('a'), null, 'b').isStale).toBe(true);
    expect(getApprovalTarget(null, null, 'b').isStale).toBe(true);
  });

  it('fails closed when the action cannot name its approval', () => {
    expect(getApprovalTarget(approval('a'), null)).toEqual({
      id: undefined,
      isStale: true,
    });
  });
});
