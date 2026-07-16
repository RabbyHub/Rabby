import { getSignMessageAddressTagLayouts } from '@/ui/views/Approval/components/signMessageAddressTagLayout';

test('places signing address tags by visible line without entering content flow', () => {
  const layouts = getSignMessageAddressTagLayouts(
    [
      { lineTop: 32, anchorHeight: 16 },
      { lineTop: 32, anchorHeight: 16 },
      { lineTop: 280, anchorHeight: 16 },
    ],
    {
      contentTop: 48,
      scrollTop: 16,
      viewportHeight: 250,
    }
  );

  expect(layouts).toMatchObject([
    { top: 72, visible: true },
    { top: 72, visible: true },
    { top: 320, visible: false },
  ]);
  expect(layouts[1].right - layouts[0].right).toBe(44);
  expect(layouts[2].right).toBe(layouts[0].right);
});
