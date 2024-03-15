import clsx from 'clsx';
import React from 'react';

export const Table: React.FC<React.HTMLProps<HTMLTableElement>> = (attrs) => {
  return (
    <div
      {...attrs}
      className={clsx('w-screen block -mx-20', attrs.className)}
    />
  );
};

export const THeader: React.FC<React.HTMLProps<HTMLTableSectionElement>> = ({
  children,
  ...attrs
}) => {
  return (
    <div {...attrs} className={clsx('block', attrs.className)}>
      <TRow>{children}</TRow>
    </div>
  );
};

export const THeadCell: React.FC<React.HTMLProps<HTMLTableCellElement>> = (
  attrs
) => {
  return (
    <div
      {...attrs}
      className={clsx(
        'uppercase text-r-neutral-foot text-12 font-normal block',
        attrs.className
      )}
    />
  );
};

export const TBody: React.FC<React.HTMLProps<HTMLTableSectionElement>> = (
  attrs
) => {
  return <div {...attrs} className={clsx('block', attrs.className)} />;
};

export const TRow: React.FC<React.HTMLProps<HTMLTableRowElement>> = (attrs) => {
  return (
    <div
      {...attrs}
      className={clsx('flex items-center px-20', attrs.className)}
    />
  );
};

export const TCell: React.FC<React.HTMLProps<HTMLTableCellElement>> = (
  attrs
) => {
  return <div {...attrs} className={clsx('block', attrs.className)} />;
};
