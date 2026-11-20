import ImgRabbyBadgeBgSemicircleShortLight from '@/ui/assets/badge/free-gas-bg-semicircle.svg';
// import ImgRabbyBadgeBgSemicircleShortDark from '@/ui/assets/badge/bg-semicircle-s-dark.svg';
import ImgRabbyBadgeBgSemicircleNoCodeLight from '@/ui/assets/badge/free-gas-bg-semicircle-nocode.svg';
// import ImgRabbyBadgeBgSemicircleNoCodeDark from '@/ui/assets/badge/bg-semicircle-nocode-dark.svg';
import { Modal } from '@/ui/component';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ReactComponent as RCIconInfo } from '@/ui/assets/badge/info.svg';
import ImgRabbyBadgeL from '@/ui/assets/badge/free-gas-badge-l.svg';
import ImgRabbyBadgeM from '@/ui/assets/badge/free-gas-badge-m.svg';

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
import styles from './freeGasBadgeModal.module.css';

const RABBY_BADGE_URL = 'https://debank.com/official-badge/134';

const LearnMore = 'https://x.com/Rabby_io/status/1785529719070368044';

const gotoDeBankRabbyBadge = () => {
  openInTab(RABBY_BADGE_URL);
};

const badgeName = 'rabby_free_gas';

const ClaimRabbyBadge = ({ onClaimed }: { onClaimed?: () => void }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [txTips, setTxTips] = useState(false);

  const [currentAccount] = useAccount();

  const wallet = useWallet();
  const {
    value: claimeInfo,
    loading: badgeHasClaimedLoading,
  } = useAsync(async () => {
    return wallet.openapi.badgeHasClaimedByName({
      id: currentAccount?.address || '',
      name: badgeName,
    });
  }, [currentAccount?.address]);

  const {
    value: mintInfo,
    loading: badgeHasMintedLoading,
  } = useAsync(async () => {
    return wallet.openapi.badgeHasMintedByName({
      id: currentAccount?.address || '',
      name: badgeName,
    });
  }, [currentAccount?.address]);

  const [
    { loading: mintLoading, value: mintResult, error: mintError },
    mint,
  ] = useAsyncFn(async () => {
    if (code && currentAccount?.address) {
      lockErrorRef.current = false;
      return wallet.openapi.mintBadgeByName({
        code,
        userAddr: currentAccount?.address,
        name: badgeName,
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
    setTxTips(false);
    setCode(e.target.value);
    lockErrorRef.current = true;
  }, []);

  const gotoLearnMore = useCallback(() => {
    openInTab(LearnMore);
  }, []);

  const { isDarkTheme } = useThemeMode();

  if (!lockErrorRef.current && !mintLoading && mintError?.message) {
    if (mintError?.message.includes('Free Gas')) {
      setTxTips(true);
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
    <div
      className={clsx(styles.wrapper, { noCode }, txTips && 'h-[505px]')}
      style={
        {
          '--free-gas-badge-bg': `url(${
            isDarkTheme
              ? ImgRabbyBadgeBgSemicircleShortLight
              : ImgRabbyBadgeBgSemicircleShortLight
          })`,
          '--free-gas-badge-bg-no-code': `url(${
            isDarkTheme
              ? ImgRabbyBadgeBgSemicircleNoCodeLight
              : ImgRabbyBadgeBgSemicircleNoCodeLight
          })`,
        } as React.CSSProperties
      }
    >
      <img
        src={ImgRabbyBadgeM}
        className="badge"
        alt={t('page.dashboard.rabbyBadge.imageLabel')}
      />
      <div className="title">{t('page.dashboard.rabbyBadge.freeGasTitle')}</div>
      <CurrentAccount noInvert={false} className="account" />
      {!noCode && (
        <>
          <div className={clsx('box widget-has-ant-input', txTips && 'swap')}>
            <Input
              className={clsx('codeInput', error && 'red')}
              placeholder={t('page.dashboard.rabbyBadge.enterClaimCode')}
              value={code}
              onChange={onInputChange}
              autoFocus
            />
            {error && <div className="error">{error}</div>}
            {txTips && (
              <div className="swapTips">
                <div className="w-12 h-12 self-start mt-[4px]">
                  <RCIconInfo viewBox="0 0 12 12" className="w-12 h-12" />
                </div>

                <span>
                  {t('page.dashboard.rabbyBadge.freeGasTip')}{' '}
                  <span onClick={gotoLearnMore} className="toSwap">
                    {t('page.dashboard.rabbyBadge.learnMore')}
                  </span>
                </span>
              </div>
            )}
          </div>
          <Button
            size="large"
            className={clsx('btn', txTips && 'mt-[83px]')}
            disabled={!code || !!error || txTips}
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
            <div className="learn-more-tips">
              {t('page.dashboard.rabbyBadge.freeGasNoCode')}{' '}
            </div>
            <Button className="btn more" onClick={gotoDeBankRabbyBadge}>
              <span>{t('page.dashboard.rabbyBadge.learnMoreOnDebank')}</span>
              <img src={ImgLink} className="ml-4 w-20 h-20" />
            </Button>
          </>
        )
      ) : null}
    </div>
  );
};

const ClaimSuccess = ({ num }: { num: number }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.claimSuccess}>
      <img
        src={ImgRabbyBadgeL}
        className="badge"
        alt={t('page.dashboard.rabbyBadge.imageLabel')}
      />
      <div className="desc">
        {t('page.dashboard.rabbyBadge.rabbyFreeGasUserNo', {
          num,
        })}
      </div>
      <div className="title">{t('page.dashboard.rabbyBadge.claimSuccess')}</div>
      <CurrentAccount className="account" />
      <Button className="btn" onClick={gotoDeBankRabbyBadge}>
        <span>{t('page.dashboard.rabbyBadge.viewOnDebank')}</span>
        <img src={ImgLink} className="ml-4 w-20 h-20" />
      </Button>
      <div className="confetti">
        <Lottie animationData={animationData} loop height={360} width={360} />
      </div>
    </div>
  );
};

export const ClaimRabbyFreeGasBadgeModal = ({
  visible,
  onCancel,
  onClaimed,
}: {
  visible: boolean;
  onCancel: () => void;
  onClaimed?: () => void;
}) => {
  return (
    <Modal
      className={clsx(styles.modal, 'modal-support-darkmode')}
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={<RcIconClose />}
    >
      <ClaimRabbyBadge onClaimed={onClaimed} />
    </Modal>
  );
};
