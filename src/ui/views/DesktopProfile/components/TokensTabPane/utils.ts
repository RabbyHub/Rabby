import {
  DESKTOP_PROFILE_TAB_NAV_HEIGHT,
  TOP_SHORTCUT_HEIGHT,
} from './constant';

const ASSETS_PROTOCOL_ANCHOR_PREFIX = 'desktop-profile-assets-protocol-';

export const ScrollToAssetDomById = (
  id: string,
  options: {
    withTopShortcut?: boolean;
    topGap?: number;
  } = {}
) => {
  const dom = document.getElementById(id);
  if (!dom) return;

  const scrollElement = dom.closest<HTMLElement>('.js-scroll-element');

  if (!scrollElement) {
    return;
  }

  const { withTopShortcut = true, topGap = 0 } = options;
  const targetRect = dom.getBoundingClientRect();
  const scrollRect = scrollElement.getBoundingClientRect();
  const stickyOffset =
    DESKTOP_PROFILE_TAB_NAV_HEIGHT +
    (withTopShortcut ? TOP_SHORTCUT_HEIGHT : 0) +
    topGap;

  scrollElement.scrollTo({
    top:
      scrollElement.scrollTop + targetRect.top - scrollRect.top - stickyOffset,
    behavior: 'smooth',
  });
};

export const getAssetsProjectAnchorId = (projectId: string) =>
  `${ASSETS_PROTOCOL_ANCHOR_PREFIX}${projectId}`;
