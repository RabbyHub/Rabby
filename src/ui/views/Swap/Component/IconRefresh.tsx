import clsx from 'clsx';
import React, { memo } from 'react';
import styled, { css, keyframes } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  12% {
    transform: rotate(-10deg);
  }
  82% {
    transform: rotate(390deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const RefreshSvg = styled.svg<{ $animating: boolean }>`
  transform-origin: 50% 50%;

  ${({ $animating }) =>
    $animating &&
    css`
      animation: ${spin} 0.82s linear infinite;
    `}
`;

interface IconRefreshProps extends React.ComponentPropsWithoutRef<'svg'> {
  spinning?: boolean;
}

export const IconRefresh = memo((props: IconRefreshProps) => {
  const { className, spinning = false, ...other } = props;

  return (
    <RefreshSvg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="transparent"
      $animating={spinning}
      className={clsx(
        'arrow-loading cursor-pointer',
        className || 'text-r-blue-default'
      )}
      {...other}
    >
      <path
        d="M1.40002 6.99844C1.40002 10.0912 3.90723 12.5984 7.00002 12.5984C10.0928 12.5984 12.6 10.0912 12.6 6.99844C12.6 3.90564 10.0928 1.39844 7.00002 1.39844"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </RefreshSvg>
  );
});
