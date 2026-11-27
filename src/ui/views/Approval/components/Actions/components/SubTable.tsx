import React, { ReactNode } from 'react';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as IconTableArrow } from 'ui/assets/sign/table-arrow.svg';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';
import styles from './SubTable.module.css';

export const SubTable = ({
  children,
  className,
  target,
}: {
  children: ReactNode;
  className?: string;
  target?: string;
}) => {
  const [left, setLeft] = React.useState(0);
  const tableRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!target) return;
    const el = document.querySelector(`#${target}`);
    const tableLeft = tableRef.current?.getBoundingClientRect().left || 0;
    const { left: elLeft, width: elWidth } = el?.getBoundingClientRect() || {
      left: 0,
      width: 0,
    };

    if (elLeft) {
      setLeft(elLeft - tableLeft + elWidth / 2);
    }
  }, [target]);

  return (
    <div className="relative">
      <div ref={tableRef} className={cn(styles.subTable, className)}>
        {children}
      </div>
      {!!left && (
        <IconTableArrow
          className={cn(styles.tableArrow, 'table-arrow text-r-neutral-card3')}
          style={{
            left: `${left}px`,
          }}
        />
      )}
    </div>
  );
};

export const SubCol = ({
  children,
  className,
  nested,
}: {
  children: ReactNode;
  className?: string;
  nested?: boolean;
}) => {
  return (
    <div
      className={clsx(styles.subCol, 'col', className, {
        nested: nested,
      })}
    >
      {children}
    </div>
  );
};

export const SubRow = ({
  children,
  isTitle = false,
  tip,
  className,
  itemsCenter,
}: {
  children: ReactNode;
  isTitle?: boolean;
  tip?: string;
  className?: string;
  itemsCenter?: boolean;
}) => {
  return (
    <div
      className={clsx(
        styles.subRow,
        'row relative',
        {
          title: isTitle,
          'items-center': itemsCenter || tip,
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
          <img
            src={IconQuestionMark}
            className="icon icon-tip ml-6 inline -mt-2"
          />
        </TooltipWithMagnetArrow>
      )}
    </div>
  );
};
