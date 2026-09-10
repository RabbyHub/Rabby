import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import Approval from '@/ui/views/Approval';

const mockWallet = { getCurrentApproval: jest.fn() };
jest.mock('ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/state/securityEngine', () => ({
  useSecurityEngineStore: (selector) => selector({ resetCurrentTx: jest.fn() }),
}));
jest.mock('@/ui/views/Approval/hooks/useApprovalUtils', () => ({
  ApprovalUtilsProvider: ({ children }) => children,
}));
jest.mock('@/ui/views/Approval/style.less', () => ({}));
jest.mock('@/ui/views/Approval/components', () => {
  const React = jest.requireActual('react');
  const { useApprovalScope } = jest.requireActual('@/ui/approval/context');
  return {
    SignTx: () => {
      const scope = useApprovalScope();
      const [initialId] = React.useState(scope.approval.approvalId);
      return React.createElement('span', null, initialId);
    },
  };
});

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

const approval = (id: string) =>
  ({
    id,
    data: { approvalComponent: 'SignTx', account: { address: '0xowner' } },
  } as any);

describe('approval scope remounts with the approval id', () => {
  it('gives B a fresh scope when the production container reloads A', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      mockWallet.getCurrentApproval.mockResolvedValue(approval('a'));
      await act(async () =>
        root.render(
          React.createElement(MemoryRouter, null, React.createElement(Approval))
        )
      );
      expect(container.textContent).toBe('a');
      mockWallet.getCurrentApproval.mockResolvedValue(approval('b'));
      await act(async () => {
        eventBus.emit(EVENTS.RELOAD_APPROVAL);
      });
      expect(container.textContent).toBe('b');
    } finally {
      await act(async () => root.unmount());
    }
  });
});
