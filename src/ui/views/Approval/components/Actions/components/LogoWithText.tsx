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
}: {
  logo?: string;
  text: string;
  icon?: ReactNode;
  logoRadius?: string;
}) => {
  return (
    <Wrapper>
      <img
        src={logo || IconUnknown}
        className="logo"
        style={{
          borderRadius: logoRadius,
        }}
      />
      <div className="text">{text}</div>
      {icon || null}
    </Wrapper>
  );
};

export default LogoWithText;
