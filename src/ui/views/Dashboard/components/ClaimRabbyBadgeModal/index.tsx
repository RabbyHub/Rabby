import { Modal, NameAndAddress } from '@/ui/component';
import React, { useCallback, useRef, useState } from 'react';
import styled from 'styled-components';
import ImgRabbyBadgeBg from '@/ui/assets/badge/bg.svg';
import ImgRabbyBadgeBg2 from '@/ui/assets/badge/bg2.svg';

import ImgRabbyBadgeM from '@/ui/assets/badge/rabby-badge-m.svg';
import ImgRabbyBadgeL from '@/ui/assets/badge/rabby-badge-l.svg';
import ImgInfo from '@/ui/assets/badge/info.svg';

import { ReactComponent as RcIconClose } from '@/ui/assets/badge/close.svg';

import ImgLink from '@/ui/assets/badge/link.svg';

import { useAccount } from '@/ui/store-hooks';
import { Button, Input, Skeleton } from 'antd';
import ImgCopy from 'ui/assets/icon-copy.svg';

import clsx from 'clsx';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import {
  KEYRING_ICONS,
  KEYRING_ICONS_WHITE,
  WALLET_BRAND_CONTENT,
} from '@/constant';

import Lottie from 'lottie-react';

import * as animationData from './success.json';
import { useAsync, useAsyncFn } from 'react-use';
import { openInTab, useWallet } from '@/ui/utils';
import { useHistory } from 'react-router';

const RABBY_BADGE_URL = 'https://debank.com/official-badge/1';

const gotoDeBankRabbyBadge = () => {
  openInTab(RABBY_BADGE_URL);
};

const CurrentAccountWrapper = styled.div`
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.13);
  display: inline-flex;
  justify-content: center;
  gap: 6px;
  height: 36px;
  align-items: center;
  padding: 0 15px;

  .icon {
    width: 20px;
    height: 20px;
  }
  .name {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    max-width: 112px;
  }
  .addr {
    font-size: 13px;
    color: #fff;
  }
  &.success {
    background: #f5f6fa;
    .name {
      color: #13141a;
    }
    .addr {
      color: #4b4d59;
    }
  }
`;

const CurrentAccount = ({
  className,
  isSuccess,
}: {
  className?: string;
  isSuccess?: boolean;
}) => {
  const [currentAccount] = useAccount();
  const brandIcon = useWalletConnectIcon(currentAccount);

  if (!currentAccount) return null;
  const addressTypeIcon: string = isSuccess
    ? brandIcon ||
      KEYRING_ICONS[currentAccount.type] ||
      WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
    : brandIcon ||
      WALLET_BRAND_CONTENT[currentAccount.brandName]?.image ||
      KEYRING_ICONS_WHITE[currentAccount.type];

  return (
    <CurrentAccountWrapper className={clsx(isSuccess && 'success', className)}>
      <img className={clsx('icon')} src={addressTypeIcon} />
      <NameAndAddress
        nameClass="name"
        addressClass="addr"
        copyIcon={isSuccess ? true : ImgCopy}
        address={currentAccount?.address}
      />
    </CurrentAccountWrapper>
  );
};

const Wrapper = styled.div`
  width: 360px;
  height: 480px;
  border-radius: 16px;
  background-color: #fff;
  background-image: url(${ImgRabbyBadgeBg});
  background-size: 360px 243px;
  background-repeat: no-repeat;
  background-size: contain;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &.noCode {
    background-image: url(${ImgRabbyBadgeBg2});
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
    color: #13141a;
    font-size: 17px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    background: #f5f6fa;
    border: 1px solid #dcdfe4;
    &::placeholder {
      color: #989aab;
      font-size: 15px;
      font-style: normal;
      font-weight: 400;
      line-height: normal;
    }
    &:hover,
    &:focus {
      border-color: #8697ff;
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
      font-family: Roboto;
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

const ClaimRabbyBadge = () => {
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

  if (!lockErrorRef.current && !mintLoading && mintError?.message) {
    if (mintError?.message.includes('swap')) {
      setSwapTips(true);
    } else {
      setError(mintError?.message);
    }
    lockErrorRef.current = true;
  }

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
    <Wrapper className={clsx({ noCode })}>
      <img src={ImgRabbyBadgeM} className="badge" alt="rabby badge" />
      <div className="title">Claim Rabby Badge for</div>
      <CurrentAccount className="account" />
      {!noCode && (
        <>
          <div className={clsx('box', swapTips && 'swap')}>
            <Input
              className={clsx('codeInput', error && 'red')}
              placeholder="Enter claim code"
              value={code}
              onChange={onInputChange}
              autoFocus
            />
            {error && <div className="error">{error}</div>}
            {swapTips && (
              <div className="swapTips">
                <img src={ImgInfo} className="w-12 h-12 self-start mt-[3px]" />
                <span>
                  You need to complete a swap with notable dex within Rabby
                  Wallet first.{' '}
                  <span onClick={gotoSwap} className="toSwap">
                    Go to Swap
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
            Claim
          </Button>
          <div className="tips" onClick={gotoDeBankRabbyBadge}>
            View your claim code
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
            <div>You haven’t activated claim code for this address </div>
            <Button
              type="primary"
              className="btn more"
              onClick={gotoDeBankRabbyBadge}
            >
              <span>Learn more on DeBank</span>
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
  background-color: #fff;
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
    color: #13141a;
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
    background: #f5f6fa;
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
  return (
    <ClaimSuccessWrapper>
      <img src={ImgRabbyBadgeL} className="badge" alt="rabby badge" />
      <div className="desc">Rabby Valued User No.{num}</div>
      <div className="title">Claim Success</div>
      <CurrentAccount className="account" isSuccess />
      <Button type="primary" className="btn" onClick={gotoDeBankRabbyBadge}>
        <span>View on DeBank</span>
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
}: {
  visible: boolean;
  onCancel: () => void;
}) => {
  console.log('visible', visible);
  return (
    <StyledModal
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={<RcIconClose />}
    >
      <ClaimRabbyBadge />
    </StyledModal>
  );
};
