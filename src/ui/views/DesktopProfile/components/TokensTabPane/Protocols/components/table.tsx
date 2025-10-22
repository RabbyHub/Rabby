import React, {
  CSSProperties,
  ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';
import styled from 'styled-components';

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
  color: var(--color-light-blue-title);
  background-color: var(--bg-white-color);
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
  color: var(--color-title);
  line-height: 17px;
  font-family: 'Noto Sans', 'Subset';

  > div {
    border-bottom: solid 1px var(--bg-default-color);
  }

  > div:last-child {
    border-bottom: 0;
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
      <Row header className={props.className ?? ''}>
        {headers.map((v, i) => {
          return (
            <Col
              key={i}
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
    <StyledRow ref={ref} className={className || ''} {...rest}>
      {children}
    </StyledRow>
  );
};

Table.Row = Row;

const Col = ({
  style,
  children,
  ...rest
}: {
  style?: CSSProperties;
  children?: ReactNode;
}) => {
  return (
    <div style={style} {...rest}>
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
