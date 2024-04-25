import React from 'react';
import { ReactComponent as RcIconGas } from '@/ui/assets/sign/tx/gas-cc.svg';
import GasLessBg from '@/ui/assets/sign/tx/bg.svg';
import { ReactComponent as RcIconLogo } from '@/ui/assets/dashboard/rabby.svg';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import clsx from 'clsx';
import LogoImage from 'ui/assets/sign/tx/rabby.svg';

import { ReactComponent as RcIconLink } from 'ui/assets/sign/tx/link.svg';
import { openInTab } from '@/ui/utils';

export function GasLessNotEnough({ url }: { url?: string }) {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => {
        url && openInTab(url);
      }}
      className="security-level-tip bg-r-neutral-card2 text-r-neutral-card2 mt-[15px]"
    >
      <RcIconGas
        viewBox="0 0 16 16"
        className="w-16 h-16 mr-4 text-r-neutral-title-1"
      />
      <span className="flex-1 text-r-neutral-title1 inline-flex gap-4 items-center">
        {t('page.signFooterBar.gasless.unavailable')}
        {/* <RcIconLink /> */}
      </span>
    </div>
  );
}

const LinearGradientAnimatedSpan = styled.span`
  font-size: 12px;
  border-radius: 6px;
  background: linear-gradient(94deg, #60bcff 14.47%, #8154ff 93.83%);
  background-size: 150% 100%;
  background-repeat: repeat-x;
  box-shadow: 0px 1px 4px 0px rgba(65, 89, 188, 0.33);
  animation: gradientLoading 3s ease infinite;

  @keyframes gradientLoading {
    0% {
      background-position: 0% 0%;
    }
    25% {
      background-position: 100% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    75% {
      background-position: 0% 100%;
    }
    100% {
      background-position: 0% 0%;
    }
  }
`;

const GasLessReady = styled.div`
  position: relative;
  height: 54px;

  & > .gas-ready,
  & > .gas-to-sign {
    position: absolute !important;
    top: 8px;
    left: 0;
    width: 100%;

    transition-property: z-index;
    transition-duration: 0s;
    transition-delay: 0.6s;
  }

  & > .gas-ready {
    z-index: -1;
    margin-top: -2px !important;
  }

  & > .gas-to-sign {
    z-index: 1;
    margin-top: 4px !important;
  }

  &.gasLess > {
    .gas-ready {
      z-index: 1;
    }
    .gas-to-sign {
      z-index: -1;
    }
  }
`;

function FreeGasReady() {
  const { t } = useTranslation();
  return (
    <span
      className="gas-ready security-level-tip bg-transparent text-transparent py-0 pt-[18px] h-[46px]"
      style={{
        backgroundImage: `url(${GasLessBg})`,
      }}
    >
      <RcIconLogo viewBox="0 0 20 20" className="w-16 h-16 mr-4 " />
      <span
        className="flex-1"
        style={{
          color: 'var(--r-blue-default, #7084FF)',
          fontSize: '13px',
          fontWeight: '500',
        }}
      >
        {t('page.signFooterBar.gasless.rabbyPayGas')}
      </span>
    </span>
  );
}

export function GasLessToSign({
  handleFreeGas,
  gasLessEnable,
}: {
  handleFreeGas: () => void;
  gasLessEnable: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <GasLessReady className={clsx(gasLessEnable && 'gasLess')}>
        <FreeGasReady />
        <span className="gas-to-sign security-level-tip bg-r-neutral-card2 text-r-neutral-card2 items-center pr-6">
          <RcIconGas
            viewBox="0 0 16 16"
            className="w-16 h-16 mr-4 text-r-neutral-title-1"
          />
          <span className="flex-1 text-r-neutral-title-1">
            {t('page.signFooterBar.gasless.notEnough')}
          </span>

          <LinearGradientAnimatedSpan
            className="mr-auto px-10 py-[7px] text-r-neutral-title-2 cursor-pointer"
            onClick={handleFreeGas}
          >
            {t('page.signFooterBar.gasless.GetFreeGasToSign')}
          </LinearGradientAnimatedSpan>
        </span>
      </GasLessReady>
    </>
  );
}

export const GasLessAnimatedWrapper = styled.div`
  &.gasLess,
  .gasLess {
    background-color: var(--r-blue-disable);
    background-image: url(${LogoImage}),
      linear-gradient(
        var(--r-blue-default, #7084ff),
        var(--r-blue-default, #7084ff)
      );
    background-repeat: no-repeat;
    background-size: 10%, 200%;
    background-position-x: -12%, 200%;
    background-position-y: center;
    animation: gasLoading 0.6s linear 1 forwards;
  }

  @keyframes gasLoading {
    0% {
      background-position-x: -12%, 200%;
    }

    50% {
      background-position-x: 50%, 150%;
    }
    99% {
      background-position-x: 100%, 108%;
    }

    100% {
      background-position-x: 120%, 100%;
      /* for PrecessActions button */
      border-color: transparent;
      color: var(--r-neutral-title2);
    }
  }
`;
