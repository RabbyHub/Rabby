import clsx from 'clsx';
import React, { useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';
import { ReactComponent as RcIconSwitchCC } from 'ui/assets/bridge/switch-arrow-cc.svg';
import { ReactComponent as RcIconLoading } from 'ui/assets/swap/quote-circle-loading-cc.svg';

const PROGRESS_SIZE = 36;
const PROGRESS_STROKE_WIDTH = 3;
const PROGRESS_RADIUS = (PROGRESS_SIZE - PROGRESS_STROKE_WIDTH) / 2;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

type RefreshCountdown = {
  startedAt: number;
  deadline: number;
  expired?: boolean;
  frozen?: boolean;
};

const QuoteRefreshProgress = ({
  startedAt,
  deadline,
  frozen,
}: RefreshCountdown) => {
  const circleRef = useRef<SVGCircleElement>(null);

  useLayoutEffect(() => {
    const circle = circleRef.current;
    if (!circle) {
      return;
    }

    if (frozen) {
      circle.style.strokeDashoffset = '0';
      return () => {
        circle.style.strokeDashoffset = '';
      };
    }

    const duration = deadline - startedAt;
    const remaining = Math.max(deadline - Date.now(), 0);
    const progress =
      duration > 0 ? Math.min(Math.max(1 - remaining / duration, 0), 1) : 1;
    const animation = circle.animate(
      [
        { strokeDashoffset: -PROGRESS_CIRCUMFERENCE * progress },
        { strokeDashoffset: -PROGRESS_CIRCUMFERENCE },
      ],
      { duration: remaining, easing: 'linear', fill: 'forwards' }
    );

    return () => animation.cancel();
  }, [startedAt, deadline, frozen]);

  return (
    <svg
      viewBox={`0 0 ${PROGRESS_SIZE} ${PROGRESS_SIZE}`}
      className="absolute w-[32px] h-[32px] left-0 top-0 text-r-blue-default pointer-events-none"
      aria-hidden="true"
    >
      <circle
        ref={circleRef}
        cx={PROGRESS_SIZE / 2}
        cy={PROGRESS_SIZE / 2}
        r={PROGRESS_RADIUS}
        transform={`rotate(-90 ${PROGRESS_SIZE / 2} ${PROGRESS_SIZE / 2})`}
        fill="none"
        stroke="currentColor"
        strokeWidth={PROGRESS_STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={PROGRESS_CIRCUMFERENCE}
        strokeDashoffset={frozen ? 0 : -PROGRESS_CIRCUMFERENCE}
      />
    </svg>
  );
};

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
  refreshCountdown,
  ...others
}: React.HTMLAttributes<HTMLDivElement> & {
  loading?: boolean;
  refreshCountdown?: RefreshCountdown | null;
}) => {
  const refreshing = Boolean(loading || refreshCountdown?.expired);

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
      {!refreshing && refreshCountdown && (
        <QuoteRefreshProgress
          startedAt={refreshCountdown.startedAt}
          deadline={refreshCountdown.deadline}
          frozen={refreshCountdown.frozen}
        />
      )}
      <RcIconLoading
        viewBox="0 0 49 49"
        style={{
          animationDuration: '0.5s!important',
        }}
        className={clsx(
          'text-r-blue-default',
          'absolute w-[32px] h-[32px] left-0 top-0 transition-opacity ',
          refreshing ? 'opacity-100 loading-spin' : 'opacity-0'
        )}
      />
    </Wrapper>
  );
};
