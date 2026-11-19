import React, { ReactNode } from 'react';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import clsx from 'clsx';
import styles from './Table.module.css';

const Table = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <div className={className}>{children}</div>;
};

const Col = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={clsx(styles.col, 'col group', className)}>{children}</div>
  );
};

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
    <div
      className={clsx(
        styles.row,
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
          inApproval
          title={tip}
          overlayClassName="rectangle w-[max-content]"
        >
          <img src={IconQuestionMark} className="icon icon-tip ml-6 inline" />
        </TooltipWithMagnetArrow>
      )}
    </div>
  );
};

export { Table, Col, Row };
