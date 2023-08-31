import React from 'react';
import styled from 'styled-components';

const DotsStyled = styled.span`
  span {
    display: inline-block;
  }

  .dot1 {
    animation: jump 1.5s infinite -0.2s;
  }

  .dot2 {
    animation: jump 1.5s infinite;
  }

  .dot3 {
    animation: jump 1.5s infinite 0.2s;
  }

  @keyframes jump {
    30% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }

    70% {
      transform: translateY(2px);
    }
  }
`;

export const Dots: React.FC = () => {
  return (
    <DotsStyled>
      <span className="dot1">.</span>
      <span className="dot2">.</span>
      <span className="dot3">.</span>
    </DotsStyled>
  );
};
