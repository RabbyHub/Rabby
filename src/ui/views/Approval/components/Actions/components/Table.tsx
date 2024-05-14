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
  return <ColWrapper className={clsx('col', className)}>{children}</ColWrapper>;
};

const RowWrapper = styled.div`
  position: relative;
  font-weight: 500;
  font-size: 13px;
  line-height: 16px;
  color: var(--r-neutral-body, #3e495e);
  white-space: nowrap;
  display: flex;
  align-items: center;

  &:not(.title) {
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &:has(.desc-list) {
    padding-right: 0;
  }
  &.title {
    flex-shrink: 0;
    flex: 1;

    .icon-tip {
      display: inline;
    }
  }
  &.has-bottom-border {
  }
  .desc-list {
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-body, #3e495e);
    margin: 0;
    font-weight: 400;
    li {
      padding-left: 10px;
      margin-bottom: 8px;
      padding-right: 10px;
      position: relative;
      &::before {
        content: '';
        position: absolute;
        left: 3px;
        width: 3px;
        height: 3px;
        background-color: var(--r-neutral-body);
        border-radius: 100%;
        top: 6px;
      }
      &:nth-child(1) {
        margin-top: 8px;
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
}: {
  children: ReactNode;
  isTitle?: boolean;
  tip?: string;
  className?: string;
}) => {
  return (
    <RowWrapper
      className={clsx(
        'row relative',
        {
          title: isTitle,
          block: tip,
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
