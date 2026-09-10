jest.mock('@/ui/utils/approval-popup', () => ({}));
import { createApprovalScope } from '@/ui/approval/context';
import type { Approval } from '@/background/service/notification';

test('captures the rendered approval identity and transaction id', () => {
  const approval = {
    id: 'rendered',
    signingTxId: 'tx-a',
    data: {
      approvalComponent: 'SignTx',
      account: { address: '0xa' },
      params: { data: [{}] },
    },
  } as Approval;
  const scope = createApprovalScope(approval);
  expect(scope.approval).toEqual({
    approvalId: 'rendered',
    component: 'SignTx',
  });
  expect(scope.signingTxId).toBe('tx-a');
  expect(scope.params).toBe(approval.data.params);
});
