import { AbstractProject } from '@/ui/utils/portfolio/types';
import cx from 'clsx';
import React, { memo, useEffect, useRef, useState } from 'react';
import { ScrollToDomById } from '../utils';
import styled from 'styled-components';
import clsx from 'clsx';

// 先不显示，设计可能还要
const IconCircleRight = ({ className }: { className?: string }) => {
  return null;
};

const AnchorWrapper = styled.div`
  background-color: var(--r-neutral-bg-1);
  padding: 10px 20px 10px;
  width: 100%;
  border-bottom: 1px solid var(--r-neutral-line);
`;

const CenterWrapper = styled.div`
  overflow: auto;
  position: static;
  scrollbar-width: none;
  margin: 0 auto;
  /* firefox */
  -ms-overflow-style: none;
  /* IE 10+ */
  white-space: nowrap;
  overflow: auto;
  max-width: 100%;
`;
export const TOP_SHORTCUT_SLOT_ID = 'top-shortcut-slot';

export const PORTFOLIO_LIST_ID = 'protocol-list-wrapper';
/* eslint-disable react-hooks/rules-of-hooks */
export const TopShortcut = memo(
  ({ projects }: { projects: AbstractProject[] }) => {
    const [id, setId] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);

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
              $anchor.style.width = $portfolioList?.clientWidth + 'px';
              $parent.style.width = $portfolioList?.clientWidth + 'px';
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

    return (
      <AnchorWrapper
        id="_anchor"
        style={{
          display: !show ? 'none' : 'block',
        }}
      >
        <CenterWrapper ref={ref}>
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
      </AnchorWrapper>
    );
  }
);
/* eslint-enable react-hooks/rules-of-hooks */
export default TopShortcut;
