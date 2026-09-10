import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ApprovalScopeContext,
  createApprovalScope,
  useApprovalScope,
} from '@/ui/approval/context';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

const approval = (id: string) =>
  ({
    id,
    data: { approvalComponent: 'SignTx' },
  } as any);

describe('approval scope remounts with the approval id', () => {
  it('gives B a fresh scope when A is replaced', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    const Probe = () => {
      const scope = useApprovalScope();
      const [initialId] = useState(scope.approval.approvalId);
      return React.createElement('span', null, initialId);
    };

    const render = (id: string) =>
      React.createElement(
        ApprovalScopeContext.Provider,
        { value: createApprovalScope(approval(id)) },
        React.createElement(Probe, { key: id })
      );

    act(() => root.render(render('a')));
    expect(container.textContent).toBe('a');

    act(() => root.render(render('b')));
    expect(container.textContent).toBe('b');

    act(() => root.unmount());
  });
});
