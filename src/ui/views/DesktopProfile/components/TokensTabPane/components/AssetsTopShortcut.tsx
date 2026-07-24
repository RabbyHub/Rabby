import { AbstractProject } from '@/ui/utils/portfolio/types';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import clsx from 'clsx';

import { ReactComponent as RcIconCircleRight } from '@/ui/views/DesktopProfile/components/ApprovalsTabPane/icons/right-cc.svg';
import {
  ASSETS_CONTENT_ID,
  DESKTOP_PROFILE_TAB_NAV_HEIGHT,
  PORTFOLIO_LIST_ID,
  TOP_SHORTCUT_HEIGHT,
} from '../constant';
import { getAssetsProjectAnchorId, ScrollToAssetDomById } from '../utils';

const ACTIVE_ANCHOR_TOLERANCE = 1;
const HORIZONTAL_SCROLL_STEP = 970;

const AnchorWrapper = styled.div`
  background-color: var(--r-neutral-bg-1);
  padding: 10px 0;
  width: 100%;
  border-bottom: 1px solid var(--r-neutral-line);
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: space-between;
`;

const CenterWrapper = styled.div`
  overflow: auto;
  position: static;
  scrollbar-width: none;
  margin: 0 auto;
  flex: 1;
  -ms-overflow-style: none;
  white-space: nowrap;
  max-width: 100%;
`;

const DirectionIcon = styled.div`
  width: 24px;
  height: 24px;
  margin-top: -3px;
  background-color: var(--r-neutral-bg-2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

interface AssetsTopShortcutProps {
  projects: AbstractProject[];
  visible: boolean;
}

export const AssetsTopShortcut = memo<AssetsTopShortcutProps>(
  ({ projects, visible }) => {
    const [id, setId] = useState('');
    const anchorRef = useRef<HTMLDivElement>(null);
    const centerRef = useRef<HTMLDivElement>(null);
    const [leftShow, setLeftShow] = useState(false);
    const [rightShow, setRightShow] = useState(false);
    const shortcutProjects = useMemo(
      () =>
        projects.filter(
          (project) => project.netWorth !== 0 || !!project._portfolios?.length
        ),
      [projects]
    );
    const shouldShow = visible && shortcutProjects.length > 0;

    useEffect(() => {
      const anchor = anchorRef.current;
      const parent = anchor?.parentElement;
      const portfolioList = document.getElementById(
        PORTFOLIO_LIST_ID
      ) as HTMLDivElement | null;

      if (!parent || !portfolioList || !anchor) {
        return;
      }

      const syncWidth = () => {
        const width = shouldShow
          ? Math.max(portfolioList.clientWidth - 2, 0)
          : 0;
        anchor.style.width = `${width}px`;
        parent.style.width = `${width}px`;

        const center = centerRef.current;
        if (!shouldShow || !center) {
          setRightShow(false);
          setLeftShow(false);
          return;
        }

        const viewportWidth = center.getBoundingClientRect().width;
        if (viewportWidth < HORIZONTAL_SCROLL_STEP) {
          setRightShow(false);
          setLeftShow(false);
          return;
        }

        setLeftShow(center.scrollLeft > 10);
        setRightShow(center.scrollLeft + viewportWidth < center.scrollWidth);
      };

      syncWidth();

      const resizeObserver =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(syncWidth);
      resizeObserver?.observe(portfolioList);
      window.addEventListener('resize', syncWidth);

      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener('resize', syncWidth);
        parent.style.width = '0px';
      };
    }, [shortcutProjects, shouldShow]);

    useEffect(() => {
      const scrollElement = anchorRef.current?.closest<HTMLElement>(
        '.js-scroll-element'
      );
      if (!scrollElement) {
        return;
      }
      const shortcutAnchorIds = new Set(
        shortcutProjects.map((project) => getAssetsProjectAnchorId(project.id))
      );

      const handleScroll = () => {
        if (!shouldShow || !centerRef.current) {
          setId('');
          return;
        }

        const assetsContent = document.getElementById(ASSETS_CONTENT_ID);
        if (!assetsContent) {
          return;
        }

        const protocolItems = [
          ...assetsContent.querySelectorAll<HTMLElement>(
            '[data-assets-anchor="true"]'
          ),
        ].filter((item) => shortcutAnchorIds.has(item.id));
        if (!protocolItems.length) {
          setId('');
          return;
        }

        const activeTop =
          scrollElement.getBoundingClientRect().top +
          DESKTOP_PROFILE_TAB_NAV_HEIGHT +
          TOP_SHORTCUT_HEIGHT;
        let activeId = '';

        protocolItems.forEach((item) => {
          if (
            item.getBoundingClientRect().top <=
            activeTop + ACTIVE_ANCHOR_TOLERANCE
          ) {
            activeId = item.id;
          }
        });
        const isAtBottom =
          scrollElement.scrollTop + scrollElement.clientHeight >=
          scrollElement.scrollHeight - ACTIVE_ANCHOR_TOLERANCE;
        if (isAtBottom) {
          activeId = protocolItems[protocolItems.length - 1].id;
        }

        setId(activeId);
        if (!activeId) {
          return;
        }

        const activeAnchor = centerRef.current.querySelector(
          `a[href="#${activeId}"]`
        );
        if (!activeAnchor) {
          return;
        }

        const { left } = activeAnchor.getBoundingClientRect();
        const {
          left: parentLeft,
          width: parentWidth,
        } = centerRef.current.getBoundingClientRect();
        const distance = left - parentLeft;
        if (distance < 0 || distance > parentWidth) {
          centerRef.current.scrollTo({
            left:
              centerRef.current.scrollLeft +
              (distance < 0 ? -parentWidth / 2 : parentWidth / 2),
          });
        }
      };

      handleScroll();
      scrollElement.addEventListener('scroll', handleScroll);
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    }, [shortcutProjects, shouldShow]);

    const scrollHorizontally = (isRight = false) => {
      if (!centerRef.current) return;
      centerRef.current.scrollTo({
        left:
          centerRef.current.scrollLeft +
          (isRight ? HORIZONTAL_SCROLL_STEP : -HORIZONTAL_SCROLL_STEP),
        behavior: 'smooth',
      });
    };

    return (
      <AnchorWrapper
        ref={anchorRef}
        style={{
          display: shouldShow ? 'flex' : 'none',
        }}
      >
        <DirectionIcon
          className={clsx('rotate-180', {
            'opacity-0': !leftShow,
          })}
          onClick={() => {
            leftShow && scrollHorizontally(false);
          }}
        >
          <RcIconCircleRight className="w-[16px] h-[16px] text-rb-neutral-secondary" />
        </DirectionIcon>
        <CenterWrapper
          ref={centerRef}
          onScroll={(event) => {
            if (!centerRef.current) return;
            setLeftShow((event.target as HTMLDivElement).scrollLeft > 10);
            const viewportWidth = centerRef.current.getBoundingClientRect()
              .width;
            setRightShow(
              centerRef.current.scrollLeft + viewportWidth <
                centerRef.current.scrollWidth
            );
          }}
        >
          {shortcutProjects.map((project) => {
            const anchorId = getAssetsProjectAnchorId(project.id);
            return (
              <a
                href={`#${anchorId}`}
                onClick={(event) => {
                  event.preventDefault();
                  ScrollToAssetDomById(anchorId);
                }}
                className={clsx(
                  'inline-block mr-[4px] w-[100px] h-[32px] px-[10px] truncate',
                  'text-r-neutral-title1 rounded-[12px] bg-r-neutral-bg-2',
                  'leading-[32px] text-r-neutral-body text-center',
                  id === anchorId
                    ? ' text-rb-brand-default bg-rb-brand-light-1'
                    : ''
                )}
                key={project.id}
              >
                {project.name || project.id}
              </a>
            );
          })}
        </CenterWrapper>
        <DirectionIcon
          className={clsx({
            'opacity-0': !rightShow,
          })}
          onClick={() => {
            rightShow && scrollHorizontally(true);
          }}
        >
          <RcIconCircleRight className="w-[16px] h-[16px] text-rb-neutral-secondary" />
        </DirectionIcon>
      </AnchorWrapper>
    );
  }
);
