import { AbstractProject } from '@/ui/utils/portfolio/types';
import React, { memo, useEffect, useRef, useState } from 'react';
import { ScrollToDomById } from '../utils';
import styled from 'styled-components';
import clsx from 'clsx';
import { ReactComponent as RcIconCircleRight } from '@/ui/views/DesktopProfile/components/ApprovalsTabPane/icons/right-cc.svg';

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
  /* firefox */
  -ms-overflow-style: none;
  /* IE 10+ */
  white-space: nowrap;
  overflow: auto;
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
export const TOP_SHORTCUT_SLOT_ID = 'top-shortcut-slot';

export const PORTFOLIO_LIST_ID = 'protocol-list-wrapper';
/* eslint-disable react-hooks/rules-of-hooks */
export const TopShortcut = memo(
  ({ projects }: { projects: AbstractProject[] }) => {
    const [id, setId] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);
    const [, setRender] = useState({});
    const [leftShow, setLeftShow] = useState(false);
    const [rShow, setRShow] = useState(false);

    useEffect(() => {
      if (!ref.current) return;
      const width = ref.current.getBoundingClientRect().width;
      const _show = ref.current!.scrollWidth > width;
      if (width < 970) {
        setRShow(false);
        setLeftShow(false);
        return;
      }
      setRShow(_show);
    }, [projects, show]);

    // 滚动监听
    useEffect(() => {
      const scrollElement = document.getElementById('root')
        ?.firstChild as HTMLElement;
      const fn = (e: any) => {
        if (!ref.current) return;
        if (scrollElement.scrollTop > 365) {
          const $parent = document.getElementById(
            TOP_SHORTCUT_SLOT_ID
          ) as HTMLDivElement;
          const $portfolioList = document.getElementById(
            PORTFOLIO_LIST_ID
          ) as HTMLDivElement;
          const $anchor = document.getElementById('_anchor') as HTMLElement;
          if (parent) {
            if ($anchor) {
              $anchor.style.width = $portfolioList?.clientWidth - 2 + 'px';
              $parent.style.width = $portfolioList?.clientWidth - 2 + 'px';
              if ($parent?.parentElement?.style?.paddingBottom) {
                $parent.parentElement.style.paddingBottom = '0px';
              }
              $parent?.appendChild($anchor);
            }
          }
          setShow(true);
        } else {
          setShow(false);
        }

        const contianerDom = scrollElement;
        if (!contianerDom) return;
        let min = Infinity;
        let idx = 0;
        let tparr = [
          ...contianerDom.querySelectorAll('.protocol-item-wrapper'),
        ];
        tparr = tparr.filter((v) => v.parentElement?.style.display !== 'none');
        if (tparr.length === 0) return;
        tparr.forEach((v, i) => {
          const { top } = v.getBoundingClientRect();
          const _v = top - 143;
          if (_v <= min && _v >= 0) {
            idx = i;
            min = _v;
          }
        });
        setId(tparr[idx].id);

        // 判断自动选择的id 是否在可视区域
        function elementInViewportRatio(ele: Element) {
          return ele.getBoundingClientRect();
        }

        const anchorA = ref.current?.querySelector(
          `a[href="#${tparr[idx].id}"]`
        );
        if (!anchorA) {
          return;
        }
        const { left } = elementInViewportRatio(anchorA);
        const { left: pleft, width: pw } = elementInViewportRatio(ref.current);
        const diff = left - pleft;
        if (diff < 0 || diff > pw) {
          const offset = ref.current.scrollLeft;
          ref.current.scrollTo({
            left: offset + (diff < 0 ? -pw / 2 : pw / 2),
          });
        }
      };

      scrollElement.addEventListener('scroll', fn);
      return () => {
        scrollElement.removeEventListener('scroll', fn);
      };
    }, [projects, show]);

    useEffect(() => {
      return () => {
        const $anchor = document.getElementById('_anchor') as HTMLElement;
        if ($anchor) {
          const $parent = document.getElementById(
            TOP_SHORTCUT_SLOT_ID
          ) as HTMLDivElement;
          $parent.removeChild($anchor);
          $anchor.style.display = 'none';
        }
      };
    }, []);

    const scrollFn = (isRight = false, width = 970) => {
      if (!ref.current) return;
      const offset = ref.current.scrollLeft;
      ref.current.scrollTo({
        left: offset - (isRight ? -width : width),
        behavior: 'smooth',
      });
      setRender({});
    };

    return (
      <AnchorWrapper
        id="_anchor"
        style={{
          display: !show ? 'none' : 'flex',
        }}
      >
        <DirectionIcon
          className={clsx('rotate-180', {
            'opacity-0': !leftShow,
          })}
          onClick={() => {
            leftShow && scrollFn(false);
          }}
        >
          <RcIconCircleRight className="w-[16px] h-[16px] text-rb-neutral-secondary" />
        </DirectionIcon>
        <CenterWrapper
          ref={ref}
          onScroll={(e) => {
            if (!ref.current) return;
            setLeftShow((e.target as HTMLDivElement).scrollLeft > 10);
            const vw = ref.current.getBoundingClientRect().width;
            const show = ref.current.scrollLeft + vw < ref.current.scrollWidth;
            setRShow(show);
          }}
        >
          {projects.map((v) => {
            if (!v) {
              return null;
            }

            const name = v.name;
            if (v.netWorth === 0 && !v._portfolios?.length) return null;
            return (
              <a
                href={`#${v.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  ScrollToDomById(v.id, true);
                }}
                className={clsx(
                  'inline-block mr-[4px] w-[100px] h-[32px] px-[10px] truncate',
                  'text-r-neutral-title1 rounded-[12px] bg-r-neutral-bg-2',
                  'leading-[32px] text-r-neutral-body text-center',
                  id === v.id
                    ? ' text-rb-brand-default bg-rb-brand-light-1'
                    : ''
                )}
                key={v.id}
              >
                {name || v.id}
              </a>
            );
          })}
        </CenterWrapper>
        <DirectionIcon
          className={clsx({
            'opacity-0': !rShow,
          })}
          onClick={() => {
            rShow && scrollFn(true);
          }}
        >
          <RcIconCircleRight className="w-[16px] h-[16px] text-rb-neutral-secondary" />
        </DirectionIcon>
      </AnchorWrapper>
    );
  }
);
/* eslint-enable react-hooks/rules-of-hooks */
export default TopShortcut;
