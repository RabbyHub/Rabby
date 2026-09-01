import type { ApprovalBinding } from './approval-context';

// A window can have two approval containers mounted at once - the route and the
// approval popup - so the published binding is a stack, not a slot. The top is
// what popups in that window act on, and a container that unmounts hands back
// to the one underneath instead of leaving the window unbound.
export const pushBinding = (
  stack: ApprovalBinding[],
  binding: ApprovalBinding
) => [...stack, binding];

export const dropBinding = (
  stack: ApprovalBinding[],
  binding: ApprovalBinding
) => stack.filter((item) => item !== binding);

export const currentBinding = (stack: ApprovalBinding[]) =>
  stack[stack.length - 1] ?? null;
