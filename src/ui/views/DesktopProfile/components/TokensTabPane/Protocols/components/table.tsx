import React, {
  CSSProperties,
  ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';
import styled from 'styled-components';
import cx from 'clsx';

const WidthContext = React.createContext<number[]>([]);

// Styled components
const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
`;

const HeaderRow = styled(FlexRow)`
  width: 100%;
  font-size: 12px;
  font-weight: bold;
  color: var(--r-neutral-title1);
  line-height: 15px;
  min-width: 800px;

  > div {
    flex: 1;
    min-width: 70px;
    white-space: nowrap;
  }

  > div > span {
    padding: 7px 10px;
    display: block;
  }

  > div:first-child > span {
    padding: 7px 0 7px 10px;
  }

  > div:last-child > span {
    padding: 7px 10px 7px 0;
    text-align: right;
  }
`;

const ContentRow = styled(FlexRow)`
  width: 100%;
  line-height: 15px;
  min-width: 800px;
  align-items: center;

  &:hover {
    background-color: var(--bg-light-color);
  }

  > div {
    flex: 1;
    overflow: hidden;
    min-width: 70px;
  }

  > div > span {
    padding: 15px 10px;
    display: block;
    overflow-wrap: break-word;
    overflow: hidden;
  }

  > div:first-child > span {
    padding: 15px 0 15px 10px;
  }

  > div:last-child > span {
    padding: 15px 10px 15px 0;
    text-align: right;
  }
`;

const Content = styled.div`
  width: 100%;
  font-size: 14px;
  color: var(--r-neutral-title1);
  line-height: 17px;

  > div {
    border-bottom: 0.5px solid var(--r-neutral-line);
  }

  > div:last-child {
    border-bottom: none;
  }
`;

export const Table = ({
  widths = [],
  children,
  className,
}: {
  widths?: number[];
  children: ReactNode;
  className?: string;
}) => (
  <div className={className}>
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
      <Row header className={cx('px-16', props.className ?? '')}>
        {headers.map((v, i) => {
          return (
            <Col
              key={i}
              className="text-13 text-r-neutral-foot font-normal"
              style={{
                width: widths[i] || '',
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
        `${dom.getAttribute('style') || ''};width:${widths[idx]}px`
      );
    }
  }, [widths]);

  const StyledRow = header ? HeaderRow : ContentRow;

  return (
    <StyledRow
      ref={ref}
      className={cx('px-16 py-[5px]', className || '')}
      {...rest}
    >
      {children}
    </StyledRow>
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
  return <Content>{props.children} </Content>;
};

Table.Body = Body;

export default Table;
