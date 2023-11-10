import React, { ReactNode } from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const TableWrapper = styled.div`
  border: 1px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
`;

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
  border-bottom: 1px solid var(--r-neutral-line, #d3d8e0);
  align-items: stretch;
  width: 100%;
  &:nth-child(1) {
    border-top-left-radius: 8px;
    overflow: hidden;
  }
  &:nth-last-child(1) {
    border-bottom: none;
    border-bottom-left-radius: 8px;
    overflow: hidden;
  }
`;

const Col = ({ children }: { children: ReactNode }) => {
  return <ColWrapper className="col">{children}</ColWrapper>;
};

const RowWrapper = styled.div`
  position: relative;
  padding: 13px 10px;
  font-weight: 500;
  font-size: 15px;
  line-height: 18px;
  color: var(--r-neutral-title-1);
  &:not(.title) {
    flex: 1;
    width: 190px;
  }
  &:has(.desc-list) {
    padding-right: 0;
  }
  &.title {
    font-size: 15px;
    line-height: 18px;
    color: var(--r-neutral-title-1, #192945);
    border-right: 1px solid var(--r-neutral-line, #d3d8e0);
    width: 120px;
    flex-shrink: 0;
    background-color: var(--r-neutral-card-3, #f7fafc);
    .icon-tip {
      display: inline;
    }
  }
  &.has-bottom-border {
    flex: 1;
    border-bottom: 1px solid #e5e9ef;
    width: auto;
    &:nth-last-child(1) {
      border-bottom: none;
    }
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
