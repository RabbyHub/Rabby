import React, { ReactNode } from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const TableWrapper = styled.div`
  border: 1px solid #ededed;
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
  border-bottom: 1px solid #ededed;
  align-items: stretch;
  width: 100%;
  &:nth-last-child(1) {
    border-bottom: none;
  }
`;

const Col = ({ children }: { children: ReactNode }) => {
  return <ColWrapper className="col">{children}</ColWrapper>;
};

const RowWrapper = styled.div`
  position: relative;
  padding: 13px 10px;
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  color: #333333;
  &:not(.title) {
    flex: 1;
    width: 190px;
  }
  &:has(.desc-list) {
    padding-right: 0;
  }
  &.title {
    font-size: 12px;
    line-height: 14px;
    color: #333333;
    border-right: 1px solid #ededed;
    width: 120px;
    flex-shrink: 0;
  }
  .desc-list {
    font-size: 13px;
    line-height: 15px;
    color: #4b4d59;
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
        background-color: #999;
        border-radius: 100%;
        top: 50%;
        margin-top: -1.5px;
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
        'row',
        {
          title: isTitle,
          flex: !!tip,
        },
        className
      )}
    >
      {children}
      {tip && (
        <TooltipWithMagnetArrow
          title={tip}
          overlayClassName="rectangle w-[max-content] max-w-[244px]"
        >
          <img src={IconQuestionMark} className="icon ml-6" />
        </TooltipWithMagnetArrow>
      )}
    </RowWrapper>
  );
};

export { Table, Col, Row };
