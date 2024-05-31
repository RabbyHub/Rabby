import { useRabbyDispatch } from '@/ui/store';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import clsx from 'clsx';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import IconUnknown from 'ui/assets/token-default.svg';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  .logo {
    width: 16px;
    height: 16px;
    margin-right: 6px;
  }
  .text {
    color: var(--r-neutral-title-1, #192945);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const LogoWithText = ({
  logo,
  text = '',
  icon,
  logoRadius = '',
  logoSize = 16,
  textStyle = {},
  className,
  id,
}: {
  logo?: string;
  text: string | ReactNode;
  icon?: ReactNode;
  logoRadius?: string;
  logoSize?: number;
  textStyle?: React.CSSProperties;
  className?: string;
  hoverToken?: TokenItem;
  id?: string;
}) => {
  const dispatch = useRabbyDispatch();

  return (
    <Wrapper className={className} id={id}>
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
