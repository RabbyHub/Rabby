import React, { ReactNode } from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const TableWrapper = styled.div``;

const Table = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <TableWrapper className={className}>{children}</TableWrapper>;
};

const ColWrapper = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;
  padding: 12px 0;
`;

const Col = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <ColWrapper className={clsx('col group', className)}>{children}</ColWrapper>
  );
};

const RowWrapper = styled.div`
  position: relative;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  color: var(--r-neutral-body, #3e495e);
  white-space: nowrap;
  display: flex;
  align-items: flex-start;
  flex: 1;

  &.wrap {
    white-space: normal;
    text-align: left;
    padding-left: 30px;
    flex: initial;
  }

  &.wrap:not(.title) {
    text-align: left;
  }

  &:not(.title) {
    text-align: right;
    text-overflow: ellipsis;
    justify-content: flex-end;
  }
  &:has(.desc-list) {
    padding-right: 0;
  }
  &.title {
    flex-shrink: 0;
    flex: 1;
    color: var(--r-neutral-title-1, #192945);
    font-weight: 400;

    .icon-tip {
      display: inline;
    }
  }
  &.has-bottom-border {
  }
  .desc-list {
    font-size: 13px;
    line-height: 16px;
    color: var(--r-neutral-foot, #6a7587);
    margin: 0;
    font-weight: 400;
    li {
      padding-left: 10px;
      margin-bottom: 4px;
      padding-right: 0;
      position: relative;
      &::before {
        content: '';
        position: absolute;
        width: 3px;
        height: 3px;
        background-color: var(--r-neutral-foot, #6a7587);
        border-radius: 100%;
        top: 6px;
        margin-left: -6px;
      }
      &:nth-child(1) {
        margin-top: 4px;
      }
      &:nth-last-child(1) {
        margin-bottom: 0;
      }
    }
  }
`;
const Row = ({
  children,
  isTitle = false,
  tip,
  className,
  wrap,
  itemsCenter,
}: {
  children: ReactNode;
  isTitle?: boolean;
  tip?: string;
  className?: string;
  wrap?: boolean;
  itemsCenter?: boolean;
}) => {
  return (
    <RowWrapper
      className={clsx(
        'row relative',
        {
          title: isTitle,
          'items-center': itemsCenter || tip,
          wrap: wrap,
        },
        className
      )}
    >
      {children}
      {tip && (
        <TooltipWithMagnetArrow
          title={tip}
          overlayClassName="rectangle w-[max-content] max-w-[355px]"
        >
          <img src={IconQuestionMark} className="icon icon-tip ml-6 inline" />
        </TooltipWithMagnetArrow>
      )}
    </RowWrapper>
  );
};

export { Table, Col, Row };
