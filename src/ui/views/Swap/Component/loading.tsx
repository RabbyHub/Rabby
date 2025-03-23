import { DEX } from '@/constant';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React, { SVGProps } from 'react';
import { useRabbySelector } from '@/ui/store';
import ImgRabbyWallet from '@/ui/assets/swap/rabby-wallet.png';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { useThemeMode } from '@/ui/hooks/usePreference';

type QuoteListLoadingProps = {
  fetchedList?: string[];
};

export const QuoteLoading = ({
  logo,
  name,
}: {
  logo: string;
  name: string;
}) => {
  return (
    <div
      className={clsx(
        'h-[88px] flex items-center px-16 rounded-[6px]',
        'border-solid border border-rabby-neutral-line'
      )}
    >
      <div className="flex flex-col gap-10">
        <div className="flex items-center gap-4">
          <Skeleton.Avatar active size={24} shape="circle" />
          <Skeleton.Input
            active
            style={{
              borderRadius: '2px',
              width: 70,
              height: 18,
            }}
          />
        </div>

        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 90,
            height: 16,
          }}
        />
      </div>

      <div className="ml-auto gap-12 flex flex-col items-end">
        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 132,
            height: 20,
          }}
        />

        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 90,
            height: 16,
          }}
        />
      </div>
    </div>
  );
};

export const QuoteListLoading = ({
  fetchedList: dataList,
}: QuoteListLoadingProps) => {
  const supportedDEXList = useRabbySelector((s) => s.swap.supportedDEXList);
  return (
    <>
      {Object.entries(DEX).map(([key, value]) => {
        if (
          !supportedDEXList.includes(key) ||
          (dataList && dataList.includes(key))
        )
          return null;
        return <QuoteLoading logo={value.logo} key={key} name={value.name} />;
      })}
    </>
  );
};

const DotsStyled = styled.span`
  span {
    display: inline-block;
    color: var(--r-neutral-foot, #6a7587);
  }

  .dot1 {
    animation: SwapLoadingJump 1.5s infinite -0.2s;
  }

  .dot2 {
    animation: SwapLoadingJump 1.5s infinite;
  }

  .dot3 {
    animation: SwapLoadingJump 1.5s infinite 0.2s;
  }

  @keyframes SwapLoadingJump {
    30% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2px);
    }

    70% {
      transform: translateY(2px);
    }
  }
`;

const Dots: React.FC = () => {
  return (
    <DotsStyled className="relative -top-2">
      <span className="dot1">.</span>
      <span className="dot2">.</span>
      <span className="dot3">.</span>
    </DotsStyled>
  );
};

const SvgComponent = (props: SVGProps<SVGSVGElement>) => {
  const { isDarkTheme } = useThemeMode();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={267}
      height={81}
      viewBox="0 0 267 81"
      fill="none"
      {...props}
    >
      <g filter="url(#a)">
        <rect
          width={239.918}
          height={54.175}
          x={13.807}
          y={6.661}
          fill={isDarkTheme ? '#404455' : '#fff'}
          rx={5.147}
        />
        <rect
          width={239.596}
          height={53.853}
          x={13.968}
          y={6.822}
          stroke="var(--r-neutral-line)"
          strokeWidth={0.322}
          rx={4.986}
        />
        <circle
          cx={35.187}
          cy={27.571}
          r={10.293}
          fill="var(--r-neutral-card-2)"
        />
        <path
          fill="var(--r-neutral-card-2)"
          d="M53.22 18.558h84.92v12.867H53.22zM156.462 18.558h84.92v12.867h-84.92zM53.197 37.853h58.543V50.72H53.197zM182.776 37.853h58.543V50.72h-58.543z"
        />
      </g>
      <defs>
        <filter
          id="a"
          width={265.573}
          height={79.831}
          x={0.979}
          y={0.247}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy={6.414} />
          <feGaussianBlur stdDeviation={6.414} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow_103889_1305"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_103889_1305"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

const StyledLoading = styled.div`
  position: relative;
  width: 272.429px;
  height: 136.214px;
  margin: 0 auto;

  .item {
    position: absolute;
    left: 50%;
    top: 30px;
    animation: 3s infinite;
    width: 300px;
    height: 100px;
  }
  .item-1 {
    animation-name: loopingLoad1;
  }
  .item-2 {
    animation-name: loopingLoad2;
  }
  .item-3 {
    animation-name: loopingLoad3;
  }

  @keyframes loopingLoad1 {
    0%,
    14.28%,
    85.71%,
    100% {
      transform: translateX(-50%) translateY(0) scale(1);
      opacity: 1;
      z-index: 2;
    }
    28.57%,
    42.85% {
      transform: translateX(-50%) translateY(-32px) scale(0.741);
      opacity: 0.5;
      z-index: 1;
    }
    57.14%,
    71.42% {
      transform: translateX(-50%) translateY(30px) scale(0.741);
      opacity: 0.5;
      z-index: 1;
    }
  }
  @keyframes loopingLoad2 {
    0%,
    14.28%,
    85.71%,
    100% {
      transform: translateX(-50%) translateY(-32px) scale(0.741);
      opacity: 0.5;
      z-index: 1;
    }
    28.57%,
    42.85% {
      transform: translateX(-50%) translateY(30px) scale(0.741);
      opacity: 0.5;
      z-index: 1;
    }
    57.14%,
    71.42% {
      transform: translateX(-50%) translateY(0) scale(1);
      opacity: 1;
      z-index: 2;
    }
  }

  @keyframes loopingLoad3 {
    0%,
    14.28%,
    85.71%,
    100% {
      transform: translateX(-50%) translateY(30px) scale(0.74);
      opacity: 0.5;
      z-index: 1;
    }
    28.57%,
    42.85% {
      transform: translateX(-50%) translateY(0) scale(1);
      opacity: 1;
      z-index: 2;
    }
    57.14%,
    71.42% {
      transform: translateX(-50%) translateY(-32px) scale(0.74);
      opacity: 0.5;
      z-index: 1;
    }
  }
`;

export const BestQuoteLoading = () => {
  const { t } = useTranslation();

  return (
    <div>
      <StyledLoading>
        <SvgComponent className="item item-1" />
        <SvgComponent className="item item-2" />
        <SvgComponent className="item item-3" />
      </StyledLoading>

      <div className="mt-18 flex items-center justify-center gap-4">
        <img src={ImgRabbyWallet} className="w-14 h-14 rounded-full" />
        <span className="text-12 text-r-neutral-foot">
          {t('page.swap.fetch-best-quote')}
        </span>
        <Dots />
      </div>
    </div>
  );
};
