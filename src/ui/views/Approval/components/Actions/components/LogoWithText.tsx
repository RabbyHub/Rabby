import React, { ReactNode } from 'react';
import styled from 'styled-components';
import IconUnknown from 'ui/assets/token-default.svg';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  .logo {
    width: 16px;
    height: 16px;
    margin-right: 6px;
  }
  .text {
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: #333333;
    margin-right: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const LogoWithText = ({
  logo,
  text,
  icon,
  logoRadius = '',
  logoSize = 16,
  textStyle = {},
  className,
}: {
  logo?: string;
  text: string;
  icon?: ReactNode;
  logoRadius?: string;
  logoSize?: number;
  textStyle?: React.CSSProperties;
  className?: string;
}) => {
  return (
    <Wrapper className={className}>
      <img
        src={logo || IconUnknown}
        className="logo"
        style={{
          borderRadius: logoRadius,
          width: `${logoSize}px`,
          height: `${logoSize}px`,
        }}
      />
      <div className="text" style={textStyle}>
        {text}
      </div>
      {icon || null}
    </Wrapper>
  );
};

export default LogoWithText;
