import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import {
  ASSETS_CONTENT_ID,
  DEFI_OVERVIEW_ID,
  DEFI_OVERVIEW_TOP_GAP,
  DESKTOP_PROFILE_TAB_NAV_HEIGHT,
  TOKENS_SECTION_ID,
  TOP_SHORTCUT_HEIGHT,
} from '../constant';
import { ScrollToAssetDomById } from '../utils';

export type AssetsSection = 'tokens' | 'difi';

const SCROLL_POSITION_TOLERANCE = 2;
const PROGRAMMATIC_SCROLL_LOCK_TIMEOUT = 600;
const PROGRAMMATIC_SCROLL_IDLE_TIMEOUT = 120;
const SCROLL_INTERRUPT_EVENTS = ['wheel', 'touchstart', 'pointerdown'] as const;

interface AssetsScrollElements {
  scrollElement: HTMLDivElement;
  assetsContent: HTMLElement;
  tokensSection: HTMLElement;
  projectOverviewElement: HTMLElement;
}

const getAssetsScrollState = ({
  scrollElement,
  assetsContent,
  projectOverviewElement,
}: AssetsScrollElements) => {
  const scrollRect = scrollElement.getBoundingClientRect();
  const projectOverviewRect = projectOverviewElement.getBoundingClientRect();
  const assetsContentRect = assetsContent.getBoundingClientRect();
  const tabsBoundary = scrollRect.top + DESKTOP_PROFILE_TAB_NAV_HEIGHT;
  const defiBoundary = tabsBoundary + DEFI_OVERVIEW_TOP_GAP;
  const topShortcutBoundary = tabsBoundary + TOP_SHORTCUT_HEIGHT;
  const isScrollable =
    scrollElement.scrollHeight >
    scrollElement.clientHeight + SCROLL_POSITION_TOLERANCE;
  const isAtBottom =
    isScrollable &&
    scrollElement.scrollTop + scrollElement.clientHeight >=
      scrollElement.scrollHeight - SCROLL_POSITION_TOLERANCE;
  const isDefiAreaVisible =
    projectOverviewRect.top < scrollRect.bottom &&
    assetsContentRect.bottom > defiBoundary;

  return {
    projectOverviewRect,
    tabsBoundary,
    defiBoundary,
    isTopShortcutVisible: projectOverviewRect.bottom <= topShortcutBoundary,
    isAtBottom,
    isDefiAreaVisible,
  };
};

type AssetsScrollState = ReturnType<typeof getAssetsScrollState>;

interface UseAssetsSectionNavigationParams {
  contentRevision: number;
  enabled: boolean;
  hasProjects: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
}

export const useAssetsSectionNavigation = ({
  contentRevision,
  enabled,
  hasProjects,
  scrollContainerRef,
}: UseAssetsSectionNavigationParams) => {
  const [activeSection, setActiveSection] = useState<AssetsSection>('tokens');
  const [isTopShortcutVisible, setIsTopShortcutVisible] = useState(false);
  const pendingSectionRef = useRef<AssetsSection | null>(null);
  const pendingSectionFrameRef = useRef<number | null>(null);
  const scrollLockRef = useRef<AssetsSection | null>(null);
  const scrollLockTimerRef = useRef<number | null>(null);

  const cancelPendingSectionFrame = useMemoizedFn(() => {
    if (pendingSectionFrameRef.current !== null) {
      cancelAnimationFrame(pendingSectionFrameRef.current);
      pendingSectionFrameRef.current = null;
    }
  });

  const cancelPendingSection = useMemoizedFn(() => {
    cancelPendingSectionFrame();
    pendingSectionRef.current = null;
  });

  const clearScrollLockTimer = useMemoizedFn(() => {
    if (scrollLockTimerRef.current !== null) {
      window.clearTimeout(scrollLockTimerRef.current);
      scrollLockTimerRef.current = null;
    }
  });

  const releaseScrollLock = useMemoizedFn(() => {
    clearScrollLockTimer();
    scrollLockRef.current = null;
  });

  const performScrollToSection = useMemoizedFn((section: AssetsSection) => {
    releaseScrollLock();
    setActiveSection(section);
    scrollLockRef.current = section;
    scrollLockTimerRef.current = window.setTimeout(() => {
      scrollLockRef.current = null;
      scrollLockTimerRef.current = null;
    }, PROGRAMMATIC_SCROLL_LOCK_TIMEOUT);

    if (section === 'tokens') {
      ScrollToAssetDomById(TOKENS_SECTION_ID, {
        withTopShortcut: false,
      });
      return;
    }

    ScrollToAssetDomById(DEFI_OVERVIEW_ID, {
      withTopShortcut: false,
      topGap: DEFI_OVERVIEW_TOP_GAP,
    });
  });

  const requestSection = useMemoizedFn((section: AssetsSection) => {
    cancelPendingSection();
    if (enabled) {
      performScrollToSection(section);
      return;
    }

    pendingSectionRef.current = section;
    setActiveSection(section);
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pendingSection = pendingSectionRef.current;
    if (!pendingSection) {
      return;
    }

    cancelPendingSectionFrame();
    pendingSectionRef.current = null;
    const frame = requestAnimationFrame(() => {
      if (pendingSectionFrameRef.current === frame) {
        pendingSectionFrameRef.current = null;
      }
      performScrollToSection(pendingSection);
    });
    pendingSectionFrameRef.current = frame;

    return () => {
      if (pendingSectionFrameRef.current === frame) {
        cancelPendingSectionFrame();
      }
    };
  }, [cancelPendingSectionFrame, enabled, performScrollToSection]);

  useEffect(
    () => () => {
      cancelPendingSection();
      releaseScrollLock();
    },
    [cancelPendingSection, releaseScrollLock]
  );

  useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    const assetsContent = document.getElementById(ASSETS_CONTENT_ID);
    const tokensSection = document.getElementById(TOKENS_SECTION_ID);
    const projectOverviewElement = document.getElementById(DEFI_OVERVIEW_ID);

    if (
      !enabled ||
      !scrollElement ||
      !assetsContent ||
      !tokensSection ||
      !projectOverviewElement
    ) {
      setIsTopShortcutVisible(false);
      return;
    }

    const scrollElements: AssetsScrollElements = {
      scrollElement,
      assetsContent,
      tokensSection,
      projectOverviewElement,
    };

    const syncTopShortcutVisibility = ({
      isTopShortcutVisible: nextIsVisible,
    }: AssetsScrollState) => {
      setIsTopShortcutVisible(nextIsVisible);
    };

    const syncActiveSection = ({
      projectOverviewRect,
      defiBoundary,
      isAtBottom,
      isDefiAreaVisible,
    }: AssetsScrollState) => {
      if (scrollLockRef.current) {
        return;
      }

      const nextActiveSection =
        projectOverviewRect.top <= defiBoundary + SCROLL_POSITION_TOLERANCE ||
        (isAtBottom && isDefiAreaVisible)
          ? 'difi'
          : 'tokens';
      setActiveSection(nextActiveSection);
    };

    const syncScrollState = () => {
      const scrollState = getAssetsScrollState(scrollElements);
      syncTopShortcutVisibility(scrollState);
      syncActiveSection(scrollState);
    };

    const finishProgrammaticScroll = (
      scrollState = getAssetsScrollState(scrollElements)
    ) => {
      releaseScrollLock();
      syncTopShortcutVisibility(scrollState);
      syncActiveSection(scrollState);
    };

    const isProgrammaticTargetReached = (scrollState: AssetsScrollState) => {
      const targetSection = scrollLockRef.current;
      if (!targetSection) {
        return true;
      }

      const {
        projectOverviewRect,
        tabsBoundary,
        defiBoundary,
        isAtBottom,
        isDefiAreaVisible,
      } = scrollState;
      const targetRect =
        targetSection === 'difi'
          ? projectOverviewRect
          : scrollElements.tokensSection.getBoundingClientRect();
      const targetBoundary =
        targetSection === 'difi' ? defiBoundary : tabsBoundary;

      return (
        Math.abs(targetRect.top - targetBoundary) <=
          SCROLL_POSITION_TOLERANCE ||
        (targetSection === 'difi' && isAtBottom && isDefiAreaVisible)
      );
    };

    const handleScroll = () => {
      const scrollState = getAssetsScrollState(scrollElements);
      syncTopShortcutVisibility(scrollState);

      if (!scrollLockRef.current) {
        syncActiveSection(scrollState);
        return;
      }

      if (isProgrammaticTargetReached(scrollState)) {
        finishProgrammaticScroll(scrollState);
        return;
      }

      clearScrollLockTimer();
      scrollLockTimerRef.current = window.setTimeout(
        finishProgrammaticScroll,
        PROGRAMMATIC_SCROLL_IDLE_TIMEOUT
      );
    };

    let syncFrame: number | null = null;
    const scheduleSyncScrollState = () => {
      if (syncFrame !== null) {
        cancelAnimationFrame(syncFrame);
      }
      syncFrame = requestAnimationFrame(() => {
        syncFrame = null;
        syncScrollState();
      });
    };

    const interruptProgrammaticScroll = () => {
      if (!scrollLockRef.current) {
        return;
      }

      releaseScrollLock();
      scheduleSyncScrollState();
    };

    scheduleSyncScrollState();
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(syncScrollState);
    [
      scrollElement,
      projectOverviewElement,
      assetsContent,
      tokensSection,
    ].forEach((element) => resizeObserver?.observe(element));
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    SCROLL_INTERRUPT_EVENTS.forEach((eventName) => {
      scrollElement.addEventListener(eventName, interruptProgrammaticScroll, {
        passive: true,
      });
    });
    window.addEventListener('resize', syncScrollState);

    return () => {
      if (syncFrame !== null) {
        cancelAnimationFrame(syncFrame);
      }
      releaseScrollLock();
      resizeObserver?.disconnect();
      scrollElement.removeEventListener('scroll', handleScroll);
      SCROLL_INTERRUPT_EVENTS.forEach((eventName) => {
        scrollElement.removeEventListener(
          eventName,
          interruptProgrammaticScroll
        );
      });
      window.removeEventListener('resize', syncScrollState);
    };
  }, [
    clearScrollLockTimer,
    contentRevision,
    enabled,
    releaseScrollLock,
    scrollContainerRef,
  ]);

  return {
    activeSection,
    isTopShortcutVisible: hasProjects && isTopShortcutVisible,
    requestSection,
    cancelPendingSection,
  };
};
