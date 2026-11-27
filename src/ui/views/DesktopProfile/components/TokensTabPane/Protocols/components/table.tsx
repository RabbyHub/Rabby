import React, {
  CSSProperties,
  ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';
import cx from 'clsx';
import styles from './table.module.css';

const WidthContext = React.createContext<number[]>([]);

export const Table = ({
  widths = [],
  children,
  className,
}: {
  widths?: number[];
  children: ReactNode;
  className?: string;
}) => (
  <div className={cx('px-8', className)}>
    <WidthContext.Provider value={widths}>{children}</WidthContext.Provider>
  </div>
);

const Header = (props: { headers: ReactNode[]; className?: string }) => {
  const Row = Table.Row;
  const Col = Table.Col;
  const { headers } = props;
  const widths = useContext(WidthContext);

  return (
    <>
      <Row
        header
        className={cx(
          'p-8 bg-rb-neutral-bg-1 rounded-[6px]',
          props.className ?? ''
        )}
      >
        {headers.map((v, i) => {
          return (
            <Col
              key={i}
              className="text-13 text-rb-neutral-foot font-normal"
              style={{
                width: widths[i] || '',
                flex: widths[i] ? `0 0 ${widths[i]}px` : '1',
              }}
            >
              {v || <>&nbsp;</>}
            </Col>
          );
        })}
      </Row>
    </>
  );
};

Table.Header = Header;

const Row = ({
  header,
  className,
  children,
  ...rest
}: {
  className?: string;
  header?: boolean;
  children: ReactNode;
}) => {
  const widths = useContext(WidthContext);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!widths.filter(Boolean).length) return;
    let idx = -1;
    for (const dom of ref?.current?.children || []) {
      idx++;
      if (!widths[idx]) continue;
      dom.setAttribute(
        'style',
        `${dom.getAttribute('style') || ''};width:${widths[idx]}px;flex:${
          widths[idx] ? `0 0 ${widths[idx]}px` : '1'
        }`
      );
    }
  }, [widths]);

  return (
    <div
      ref={ref}
      className={cx(
        header ? styles.headerRow : styles.contentRow,
        'px-0 py-[1px]',
        className || ''
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

Table.Row = Row;

const Col = ({
  style,
  children,
  className,
  ...rest
}: {
  style?: CSSProperties;
  children?: ReactNode;
  className?: string;
}) => {
  return (
    <div style={style} className={className} {...rest}>
      <span>{children}</span>
    </div>
  );
};

Table.Col = Col;

const Body = (props: { children: ReactNode }) => {
  return <div className={styles.content}>{props.children} </div>;
};

Table.Body = Body;

export default Table;
