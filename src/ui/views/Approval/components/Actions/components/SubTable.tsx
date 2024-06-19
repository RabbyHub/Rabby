import React, { ReactNode } from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as IconTableArrow } from 'ui/assets/sign/table-arrow.svg';

const SubTableWrapper = styled.div`
  border-radius: 6px;
  background: var(--r-neutral-card3, #f7fafc);
  padding: 12px;
  row-gap: 12px;
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;

  &:empty {
    display: none;

    & + .table-arrow {
      display: none;
    }
  }
`;

const TableArrow = styled(IconTableArrow)`
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
`;

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
      <SubTableWrapper ref={tableRef} className={className}>
        {children}
      </SubTableWrapper>
      {!!left && (
        <TableArrow
          className="table-arrow text-r-neutral-card3"
          style={{
            left: `${left}px`,
          }}
        />
      )}
    </div>
  );
};

const SubColWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  position: relative;

  &.nested {
    margin-top: -6px;

    .row {
      color: var(--r-neutral-foot, #6a7587) !important;
      font-weight: 400 !important;
    }
  }
`;

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
    <SubColWrapper
      className={clsx('col', className, {
        nested: nested,
      })}
    >
      {children}
    </SubColWrapper>
  );
};

const SubRowWrapper = styled.div`
  font-size: 14px;
  line-height: normal;
  color: var(--r-neutral-body, #3e495e);
  font-weight: 500;

  &.title {
    font-weight: 400;
    white-space: nowrap;
  }
`;

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
    <SubRowWrapper
      className={clsx(
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
          title={tip}
          overlayClassName="rectangle w-[max-content] max-w-[355px]"
        >
          <img src={IconQuestionMark} className="icon icon-tip ml-6 inline" />
        </TooltipWithMagnetArrow>
      )}
    </SubRowWrapper>
  );
};
