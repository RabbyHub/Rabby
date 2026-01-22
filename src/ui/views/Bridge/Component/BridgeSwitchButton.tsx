import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';
import { ReactComponent as RcIconSwitchCC } from 'ui/assets/bridge/switch-arrow-cc.svg';
import { ReactComponent as RcIconLoading } from 'ui/assets/swap/quote-circle-loading-cc.svg';

const Wrapper = styled.div`
  @keyframes loading-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .loading-spin {
    animation: loading-spin 0.5s linear infinite !important;
  }
`;

export const BridgeSwitchBtn = ({
  className,
  loading,
  ...others
}: React.HTMLAttributes<HTMLDivElement> & { loading?: boolean }) => {
  return (
    <Wrapper
      className={clsx(
        'flex items-center justify-center cursor-pointer relative',
        'w-[32px] h-[32px] rounded-[900px]',
        'bg-r-neutral-bg-1 text-rabby-neutral-foot',
        'border-[0.5px] border-solid border-rabby-neutral-line',
        'hover:border-rabby-blue-default hover:bg-rabby-blue-light1 hover:text-rabby-blue-default',
        className
      )}
      {...others}
    >
      <RcIconSwitchCC className="w-16 h-16" viewBox="0 0 16 16" />
      <RcIconLoading
        viewBox="0 0 49 49"
        style={{
          animationDuration: '0.5s!important',
        }}
        className={clsx(
          'text-r-blue-default',
          'absolute w-[32px] h-[32px] left-0 top-0 transition-opacity ',
          loading ? 'opacity-100 loading-spin' : 'opacity-0'
        )}
      />
    </Wrapper>
  );
};
