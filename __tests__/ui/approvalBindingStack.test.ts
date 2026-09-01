import {
  currentBinding,
  dropBinding,
  pushBinding,
} from '@/ui/utils/approval-binding-stack';

const a = { id: 'a', component: 'SignTx' } as any;
// same value, different object: two containers can show the same approval
const aAgain = { id: 'a', component: 'SignTx' } as any;
const b = { id: 'b', component: 'LedgerHardwareWaiting' } as any;

describe('the window approval binding stack', () => {
  it('is empty in a window with no approval page', () => {
    expect(currentBinding([])).toBeNull();
  });

  it('hands popups the most recently mounted approval', () => {
    const stack = pushBinding(pushBinding([], a), b);

    expect(currentBinding(stack)).toBe(b);
  });

  it('hands back to the container underneath when the top unmounts', () => {
    const stack = pushBinding(pushBinding([], a), b);

    expect(currentBinding(dropBinding(stack, b))).toBe(a);
  });

  it('leaves the live binding alone when an older container unmounts', () => {
    const stack = pushBinding(pushBinding([], a), b);

    expect(currentBinding(dropBinding(stack, a))).toBe(b);
  });

  it('withdraws by identity, not by value', () => {
    const stack = pushBinding(pushBinding([], a), aAgain);

    expect(currentBinding(dropBinding(stack, aAgain))).toBe(a);
  });
});
