import React, { ReactNode } from 'react';
import styled from 'styled-components';
import IconUnknown from 'ui/assets/token-default.svg';

const Wrapper = styled.div`
  display: flex;
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
  }
`;

const LogoWithText = ({
  logo,
  text,
  icon,
}: {
  logo: string;
  text: string;
  icon?: ReactNode;
}) => {
  return (
    <Wrapper>
      <img src={logo || IconUnknown} className="logo" />
      <div className="text">{text}</div>
      {icon || null}
    </Wrapper>
  );
};

export default LogoWithText;
