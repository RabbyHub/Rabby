import clsx from 'clsx';
import React from 'react';

export const Table: React.FC<React.HTMLProps<HTMLTableElement>> = (attrs) => {
  return (
    <table {...attrs} className={clsx('w-full table-fixed', attrs.className)} />
  );
};

export const THeader: React.FC<React.HTMLProps<HTMLTableSectionElement>> = ({
  children,
  ...attrs
}) => {
  return (
    <thead {...attrs}>
      <tr>{children}</tr>
    </thead>
  );
};

export const THeadCell: React.FC<React.HTMLProps<HTMLTableCellElement>> = (
  attrs
) => {
  return (
    <th
      {...attrs}
      className={clsx(
        'uppercase text-black text-12 font-normal',
        attrs.className
      )}
    />
  );
};

export const TBody: React.FC<React.HTMLProps<HTMLTableSectionElement>> = (
  attrs
) => {
  return <tbody {...attrs} />;
};

export const TRow: React.FC<React.HTMLProps<HTMLTableRowElement>> = (attrs) => {
  return <tr {...attrs} />;
};

export const TCell: React.FC<React.HTMLProps<HTMLTableCellElement>> = (
  attrs
) => {
  return <td {...attrs} />;
};
