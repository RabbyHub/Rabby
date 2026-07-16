import { getSignMessageAddressTagLayouts } from '@/ui/views/Approval/components/signMessageAddressTagLayout';

test('lays out only visible signing address tags', () => {
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

  expect(layouts).toEqual([
    { right: -14, top: 72 },
    { right: 30, top: 72 },
    null,
  ]);
});
