import { alignElement } from 'dom-align/dist-web/index';

describe('dom-align patch', () => {
  it('does not crash when the source has no visible rectangle', () => {
    const source = document.createElement('div');
    const target = document.createElement('button');
    document.body.append(source, target);

    expect(
      (alignElement as typeof alignElement & {
        __getVisibleRectForElement: (element: HTMLElement) => DOMRect | null;
      }).__getVisibleRectForElement(source)
    ).toBeNull();

    expect(() =>
      alignElement(source, target, {
        points: ['tl', 'bl'],
        viewportOffset: [8, 8, -8, -8],
      } as Parameters<typeof alignElement>[2])
    ).not.toThrow();

    source.remove();
    target.remove();
  });
});
