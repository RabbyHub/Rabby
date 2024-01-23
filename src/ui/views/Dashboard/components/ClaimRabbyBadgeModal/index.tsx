import ImgRabbyBadgeBgSemicircleShortLight from '@/ui/assets/badge/bg-semicircle-s-light.svg';
import ImgRabbyBadgeBgSemicircleShortDark from '@/ui/assets/badge/bg-semicircle-s-dark.svg';
import ImgRabbyBadgeBgSemicircleNoCodeLight from '@/ui/assets/badge/bg-semicircle-nocode-light.svg';
import ImgRabbyBadgeBgSemicircleNoCodeDark from '@/ui/assets/badge/bg-semicircle-nocode-dark.svg';
import { Modal } from '@/ui/component';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

import ImgInfo from '@/ui/assets/badge/info.svg';
import ImgRabbyBadgeL from '@/ui/assets/badge/rabby-badge-l.svg';
import ImgRabbyBadgeM from '@/ui/assets/badge/rabby-badge-m.svg';

import { ReactComponent as RcIconClose } from '@/ui/assets/badge/close.svg';

import ImgLink from '@/ui/assets/badge/link.svg';

import { useAccount } from '@/ui/store-hooks';
import { Button, Input, Skeleton } from 'antd';

import clsx from 'clsx';

import Lottie from 'lottie-react';

import { CurrentAccount } from '@/ui/component/CurrentAccout';
import { openInTab, useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { useAsync, useAsyncFn } from 'react-use';
import * as animationData from './success.json';
import { useThemeMode } from '@/ui/hooks/usePreference';

const RABBY_BADGE_URL = 'https://debank.com/official-badge/2';

const gotoDeBankRabbyBadge = () => {
  openInTab(RABBY_BADGE_URL);
};

const Wrapper = styled.div<{
  isDarkMode?: boolean;
}>`
  width: 360px;
  height: 480px;
  border-radius: 16px;
  border-radius: 16px;
  background: var(--r-neutral-bg1, #1c1f2b);
  color: var(--r-neutral-foot, #babec5);
  box-shadow: 0px 24px 40px 0px rgba(19, 20, 26, 0.16);
  ${(props) => {
    if (props.isDarkMode) {
      return css`
        background-image: url(${ImgRabbyBadgeBgSemicircleShortDark});
      `;
    }
    return css`
      background-image: url(${ImgRabbyBadgeBgSemicircleShortLight});
    `;
  }}
  background-size: 360px 243px;
  background-repeat: no-repeat;
  background-size: contain;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &.noCode {
    ${(props) => {
      if (props.isDarkMode) {
        return css`
          background-image: url(${ImgRabbyBadgeBgSemicircleNoCodeDark});
        `;
      }
      return css`
        background-image: url(${ImgRabbyBadgeBgSemicircleNoCodeLight});
      `;
    }}
    background-size: 360px 300px;

    .badge {
      width: 160px;
      height: 160px;
    }
    .account {
      margin-bottom: 94px;
    }
  }

  .badge {
    width: 120px;
    height: 120px;
  }

  .title {
    margin-top: 14px;
    margin-bottom: 12px;
    color: #fff;
    text-align: center;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
  }
  .account {
    margin-bottom: 67px;
  }
  .codeInput {
    width: 320px;
    padding: 12px;
    color: var(--r-neutral-title1, #f7fafc);
    font-size: 17px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    /* background: #f5f6fa;
    border: 1px solid #dcdfe4; */
    &::placeholder {
      color: #989aab;
      font-size: 15px;
      font-style: normal;
      font-weight: 400;
      line-height: normal;
    }
    &:hover,
    &:focus {
      border-color: var(--r-blue-default, #7084ff);
    }

    &.red,
    &.red:hover,
    &.red:focus {
      border-color: #ec5151;
    }
  }

  .box {
    position: relative;
    &.swap {
      top: -20px;
    }
    .error {
      position: absolute;
      bottom: -30px;
      left: 0;
      margin-top: 12px;
      color: #ec5151;
      font-size: 13px;
      font-style: normal;
      font-weight: 400;
      line-height: 18px;
    }

    .swapTips {
      position: absolute;
      bottom: -64px;
      left: 0;
      margin-top: 12px;
      position: absolute;
      border-radius: 4px;
      background: #f2f4f7;
      height: 52px;
      padding: 8px 12px;
      padding-left: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-style: normal;
      font-weight: 400;
      line-height: 18px;

      .toSwap {
        cursor: pointer;
        color: #7084ff;
        text-decoration-line: underline;
      }
    }
  }

  .btn {
    margin-top: 58px;
    width: 200px;
    height: 48px;
    font-size: 15px;
    font-style: normal;
    font-weight: 500;
    border-radius: 6px;
    &.ant-btn-primary[disabled] {
      background: rgba(134, 151, 255, 1);
      border-color: transparent;
      opacity: 0.4;
    }

    &.more {
      margin-top: 32px;
      width: 291px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 4px;
    }
  }

  .tips {
    margin-top: 16px;
    color: #616476;
    font-size: 13px;
    font-style: normal;
    font-weight: 400;
    line-height: 18px;
    text-decoration-line: underline;
    cursor: pointer;
  }
`;

const ClaimRabbyBadge = ({ onClaimed }: { onClaimed?: () => void }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [swapTips, setSwapTips] = useState(false);

  const [currentAccount] = useAccount();

  const wallet = useWallet();
  const {
    value: claimeInfo,
    loading: badgeHasClaimedLoading,
  } = useAsync(async () => {
    return wallet.openapi.badgeHasClaimed(currentAccount?.address || '');
  }, [currentAccount?.address]);

  const {
    value: mintInfo,
    loading: badgeHasMintedLoading,
  } = useAsync(async () => {
    return wallet.openapi.badgeHasMinted(currentAccount?.address || '');
  }, [currentAccount?.address]);

  const [
    { loading: mintLoading, value: mintResult, error: mintError },
    mint,
  ] = useAsyncFn(async () => {
    if (code && currentAccount?.address) {
      lockErrorRef.current = false;
      return wallet.openapi.mintBadge({
        code,
        userAddr: currentAccount?.address,
      });
    }
  }, [code, currentAccount?.address]);

  const lockErrorRef = useRef(true);

  const handleClaim = useCallback(() => {
    if (code && currentAccount?.address) {
      mint();
    }
  }, [code, currentAccount?.address, mint]);

  const noCode = !claimeInfo?.has_claimed;
  const loading = badgeHasClaimedLoading || badgeHasMintedLoading;

  const onInputChange = useCallback((e) => {
    setError('');
    setSwapTips(false);
    setCode(e.target.value);
    lockErrorRef.current = true;
  }, []);

  const history = useHistory();

  const gotoSwap = useCallback(() => {
    history.push('/dex-swap');
  }, []);

  const { isDarkTheme } = useThemeMode();

  if (!lockErrorRef.current && !mintLoading && mintError?.message) {
    if (mintError?.message.includes('swap')) {
      setSwapTips(true);
    } else {
      setError(mintError?.message);
    }
    lockErrorRef.current = true;
  }

  useEffect(() => {
    if (mintResult?.is_success || mintInfo?.has_minted) {
      onClaimed?.();
    }
  }, [onClaimed, mintResult?.is_success, mintInfo?.has_minted]);

  if (mintResult?.is_success || mintInfo?.has_minted) {
    return (
      <ClaimSuccess
        num={
          mintInfo?.has_minted ? mintInfo?.inner_id : mintResult?.inner_id || 0
        }
      />
    );
  }

  return (
    <Wrapper className={clsx({ noCode })} isDarkMode={isDarkTheme}>
      <img
        src={ImgRabbyBadgeM}
        className="badge"
        alt={t('page.dashboard.rabbyBadge.imageLabel')}
      />
      <div className="title">{t('page.dashboard.rabbyBadge.title')}</div>
      <CurrentAccount noInvert={false} className="account" />
      {!noCode && (
        <>
          <div className={clsx('box widget-has-ant-input', swapTips && 'swap')}>
            <Input
              className={clsx('codeInput', error && 'red')}
              placeholder={t('page.dashboard.rabbyBadge.enterClaimCode')}
              value={code}
              onChange={onInputChange}
              autoFocus
            />
            {error && <div className="error">{error}</div>}
            {swapTips && (
              <div className="swapTips">
                <img src={ImgInfo} className="w-12 h-12 self-start mt-[3px]" />
                <span>
                  {t('page.dashboard.rabbyBadge.swapTip')}{' '}
                  <span onClick={gotoSwap} className="toSwap">
                    {t('page.dashboard.rabbyBadge.goToSwap')}
                  </span>
                </span>
              </div>
            )}
          </div>
          <Button
            type="primary"
            size="large"
            className="btn"
            disabled={!code || !!error || swapTips}
            onClick={handleClaim}
            loading={mintLoading}
          >
            {t('page.dashboard.rabbyBadge.claim')}
          </Button>
          <div className="tips" onClick={gotoDeBankRabbyBadge}>
            {t('page.dashboard.rabbyBadge.viewYourClaimCode')}
          </div>
        </>
      )}
      {noCode ? (
        loading ? (
          <>
            <Skeleton.Input active className="w-[306px] h-[43px] mb-[21px]" />
            <Skeleton.Input active className="w-[234px] h-[48px]" />
          </>
        ) : (
          <>
            <div>{t('page.dashboard.rabbyBadge.noCode')} </div>
            <Button
              type="primary"
              className="btn more"
              onClick={gotoDeBankRabbyBadge}
            >
              <span>{t('page.dashboard.rabbyBadge.learnMoreOnDebank')}</span>
              <img src={ImgLink} className="ml-4 w-20 h-20" />
            </Button>
          </>
        )
      ) : null}
    </Wrapper>
  );
};

const ClaimSuccessWrapper = styled.div`
  width: 360px;
  height: 480px;
  border-radius: 16px;
  /* background-color: #fff; */
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  .badge {
    width: 160px;
    height: 160px;
  }
  .title,
  .desc {
    color: var(--r-neutral-title2, #fff);
    text-align: center;
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
  }

  .desc {
    font-size: 17px;
    margin-top: 24px;
    margin-bottom: 32px;
    color: #546ce2;
  }
  .title {
    margin-bottom: 16px;
  }

  .account {
    margin-bottom: 54px;
    background: var(--r-neutral-card2, rgba(255, 255, 255, 0.06));
  }
  .btn {
    width: 252px;
    height: 50px;
    font-size: 15px;
    font-style: normal;
    font-weight: 500;
    border-radius: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    background: #27c193;
    border: none;
    box-shadow: 0px 8px 16px 0px rgba(58, 178, 128, 0.16);
  }
  .confetti {
    position: absolute;
    top: 20px;
    left: 0;
    pointer-events: none;
  }
`;

const ClaimSuccess = ({ num }: { num: number }) => {
  const { t } = useTranslation();
  return (
    <ClaimSuccessWrapper>
      <img
        src={ImgRabbyBadgeL}
        className="badge"
        alt={t('page.dashboard.rabbyBadge.imageLabel')}
      />
      <div className="desc">
        {t('page.dashboard.rabbyBadge.rabbyValuedUserNo', {
          num,
        })}
      </div>
      <div className="title">{t('page.dashboard.rabbyBadge.claimSuccess')}</div>
      <CurrentAccount className="account" />
      <Button type="primary" className="btn" onClick={gotoDeBankRabbyBadge}>
        <span>{t('page.dashboard.rabbyBadge.viewOnDebank')}</span>
        <img src={ImgLink} className="ml-4 w-20 h-20" />
      </Button>
      <div className="confetti">
        <Lottie animationData={animationData} loop height={360} width={360} />
      </div>
    </ClaimSuccessWrapper>
  );
};

const StyledModal = styled(Modal)`
  padding-bottom: 0;
  .ant-modal-content {
    border-radius: 16px;
    overflow: initial;
  }
  .ant-modal-body {
    padding: 0;
  }
  .ant-modal-close {
    top: -10px;
    right: -10px;
  }
  .ant-modal-close-x {
    width: auto;
    height: auto;
  }
`;

export const ClaimRabbyBadgeModal = ({
  visible,
  onCancel,
  onClaimed,
}: {
  visible: boolean;
  onCancel: () => void;
  onClaimed?: () => void;
}) => {
  return (
    <StyledModal
      className="modal-support-darkmode"
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={<RcIconClose />}
    >
      <ClaimRabbyBadge onClaimed={onClaimed} />
    </StyledModal>
  );
};
