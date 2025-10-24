import cx from 'clsx';
import React from 'react';
import styled from 'styled-components';

type Props = {
  label: string | JSX.Element | undefined;
  icon: JSX.Element;
  maxWidth?: number;
  style?: React.CSSProperties;
  textHidden?: boolean;
  labelClassName?: string;
  className?: string;
};

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  justify-content: start;
  flex-wrap: wrap;
  gap: 6px;
  div {
    text-overflow: ellipsis;
    overflow-wrap: break-word;
    word-break: break-all;
  }
  img {
    /* margin-right: 6px; */
  }
`;

export const LabelWithIcon: React.FC<Props> = (props) => {
  return (
    <Container
      title={typeof props.label === 'string' ? props.label : ''}
      className={props.className}
      style={Object.assign(
        props.maxWidth ? { maxWidth: props.maxWidth } : {},
        props.style
      )}
    >
      {props.icon}
      <div className={cx(props.textHidden && 'ellipsis', props.labelClassName)}>
        {props.label}
      </div>
    </Container>
  );
};

export default LabelWithIcon;
