import { useMemoizedFn } from 'ahooks';
import type { RefObject } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { useRabbyDispatch } from '@/ui/store';
import { useAssetsSectionNavigation } from '../components/TokensTabPane/hooks/useAssetsSectionNavigation';
import type { AssetsSection } from '../components/TokensTabPane/hooks/useAssetsSectionNavigation';

const PROFILE_CONTENT_TOP = 136;

const isAssetsSection = (key: string): key is AssetsSection =>
  key === 'tokens' || key === 'difi';

interface UseDesktopProfileTabNavigationParams {
  contentRevision: number;
  hasAssetsProjects: boolean;
  isActive: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
}

export const useDesktopProfileTabNavigation = ({
  contentRevision,
  hasAssetsProjects,
  isActive,
  scrollContainerRef,
}: UseDesktopProfileTabNavigationParams) => {
  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();

  const activeTab =
    location.pathname.match(/^\/desktop\/profile(?:\/([^/?]+))?/)?.[1] ||
    'assets';
  const tabPaneActiveKey = activeTab === 'assets' ? 'tokens' : activeTab;
  const isAssetsTabActive = isActive && activeTab === 'assets';

  const {
    activeSection,
    isTopShortcutVisible,
    requestSection,
    cancelPendingSection,
  } = useAssetsSectionNavigation({
    contentRevision,
    enabled: isAssetsTabActive,
    hasProjects: hasAssetsProjects,
    scrollContainerRef,
  });

  const navigateToProfileRoute = useMemoizedFn((key: string) => {
    dispatch.desktopProfile.setField({ activeTab: key });
    history.replace(`/desktop/profile/${key}`);

    const scrollElement = scrollContainerRef.current;
    if (!scrollElement || scrollElement.scrollTop <= PROFILE_CONTENT_TOP) {
      return;
    }

    requestAnimationFrame(() => {
      scrollElement.scrollTo(0, PROFILE_CONTENT_TOP);
    });
  });

  const handleTabChange = useMemoizedFn((key: string) => {
    if (isAssetsSection(key)) {
      requestSection(key);
      if (activeTab !== 'assets') {
        navigateToProfileRoute('assets');
      }
      return;
    }

    cancelPendingSection();
    navigateToProfileRoute(key);
  });

  const handleTabClick = useMemoizedFn((key: string) => {
    if (key === tabPaneActiveKey && isAssetsSection(key)) {
      handleTabChange(key);
    }
  });

  return {
    activeTab,
    tabPaneActiveKey,
    tabBarActiveKey: activeTab === 'assets' ? activeSection : tabPaneActiveKey,
    isTopShortcutVisible,
    handleTabChange,
    handleTabClick,
  };
};
