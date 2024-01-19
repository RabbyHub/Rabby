import { PageHeader } from '@/ui/component';
import { useAccount } from '@/ui/store-hooks';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useAsync, useAsyncFn } from 'react-use';
import styled, { css } from 'styled-components';
import { ReactComponent as RcIconInfo } from 'ui/assets/faucet/info-cc.svg';
import { ReactComponent as RcImgDeBankTestnetLight } from 'ui/assets/faucet/debank-testnet-light.svg';
import { ReactComponent as RcImgDeBankTestnetDark } from 'ui/assets/faucet/debank-testnet-dark.svg';
import imgUsd from 'ui/assets/faucet/usd.svg';
import imgLoading from 'ui/assets/faucet/loading.svg';
import imgBg from 'ui/assets/faucet/bg.png';
import IconSuccess from 'ui/assets/success.svg';

import { Button, message } from 'antd';
import { ClaimRabbyBadgeModal } from '../Dashboard/components/ClaimRabbyBadgeModal';
import { CurrentAccount } from '@/ui/component/CurrentAccout';
import { Loading } from './Loading';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useThemeMode } from '@/ui/hooks/usePreference';

const Wrapper = styled.div<{
  isDarkMode?: boolean;
}>`
  min-height: 100vh;
  height: 100vh;
  background: var(--r-neutral-bg2, #1c1f2b);
  overflow: hidden;
  position: relative;
  z-index: 1;
  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 400px;
    height: 217px;
    z-index: -1;
    ${(props) => {
      if (!props.isDarkMode) {
        return css`
          background: #ff6238;
        `;
      }

      return css`
        background: linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.5) 0%,
            rgba(0, 0, 0, 0.5) 100%
          ),
          #ff6238;
      `;
    }}
  }
  .body {
    padding: 0 20px;
  }
  .title {
    color: var(--r-neutral-title2, #fff);
    text-align: center;
    font-size: 17px;
    font-weight: 500;
  }

  .container {
    background: var(--r-neutral-bg1, #1c1f2b);
    box-shadow: 0px 10px 10px 0px rgba(0, 0, 0, 0.2);
    background-image: url(${imgBg});
    background-repeat: no-repeat;
    background-position: bottom;
    background-size: contain;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 448px;
    flex-shrink: 0;
    border-radius: 8px;
    padding: 24px;
    margin-top: 40px;

    &.mintedRabbyBadge {
      height: 508px;
      margin-top: 24px;

      position: relative;
      &::after {
        position: absolute;
        content: '';
        width: 100%;
        height: 314px;
        left: 0;
        bottom: 0;
        pointer-events: none;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        background: var(--r-neutral-bg1, #1c1f2b);
        z-index: -1;
      }
    }
    .tip {
      margin-top: 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--r-neutral-body, #d3d8e0);
      font-size: 15px;
      font-weight: 400;
    }

    .badgeTip {
      margin: 24px 0;
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--r-neutral-title1, #f7fafc);
      font-size: 13px;
      font-weight: 400;
    }

    .claimBtn {
      margin-bottom: 28px;
      width: 169px;
      height: 38px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0px 8px 24px 0px rgba(57, 75, 180, 0.2);
    }

    .faucetBox {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 28px;
      border-top: 0.5px solid var(--r-neutral-line);
      padding-top: 24px;
      margin: 0 auto;

      img.title {
        width: 240px;
        height: 40px;
      }
      img.usd {
        margin-top: 30px;
        margin-bottom: 16px;
        width: 52px;
        height: 52px;
      }
      .value {
        color: #ff6238;
        text-align: center;
        font-size: 24px;
        font-style: normal;
        font-weight: 500;
        line-height: normal;
      }
      .time {
        margin-top: 8px;
        color: var(--r-neutral-foot);
        text-align: center;
        font-size: 13px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
      }
      .requestedTip {
        margin-top: 48px;
        color: var(--r-neutral-body);
        text-align: center;
        font-size: 15px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
      }
      .requestBtn {
        margin-top: 32px;
        width: 184px;
        height: 42px;
        border-radius: 6px;
        background: #ff6238;
        box-shadow: 0px 8px 16px 0px rgba(250, 91, 91, 0.16);
        display: inline-flex;
        padding: 12px 64px;
        justify-content: center;
        align-items: center;
        gap: 4px;
        border-color: transparent;
        &.ant-btn-primary[disabled] {
          border-color: transparent;
          opacity: 0.6;
          box-shadow: 0px 8px 16px 0px rgba(250, 91, 91, 0.16);
        }
      }
    }
  }
`;

const RequestDeBankTestnetGasToken = () => {
  const { t } = useTranslation();
  const [currentAccount] = useAccount();
  const wallet = useWallet();

  const {
    value: mintInfo,
    loading: badgeHasMintedLoading,
  } = useAsync(async () => {
    return wallet.openapi.badgeHasMinted(currentAccount?.address || '');
  }, [currentAccount?.address]);

  const {
    value: hasRequested,
    loading: hasRequestedLoading,
  } = useAsync(async () => {
    if (currentAccount?.address) {
      return wallet.openapi.userHasRequestedFaucet({
        chain_id: 'tdbk',
        user_addr: currentAccount?.address,
      });
    }
    return { has_requested: false };
  }, [currentAccount?.address]);

  const [{ value, loading, error }, requestFaucet] = useAsyncFn(async () => {
    return wallet.openapi.requestFaucet({
      chain_id: 'tdbk',
      user_addr: currentAccount!.address,
    });
  }, [currentAccount?.address]);

  const [minted, setMinted] = useState(false);

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const onMinted = React.useCallback(() => {
    setMinted(true);
  }, []);

  const initLoading = badgeHasMintedLoading || hasRequestedLoading;

  const mintedRabbyBadge = minted || !!mintInfo?.has_minted;

  const requested =
    error?.message === 'already requested faucet' ||
    !!value?.is_success ||
    !!hasRequested?.has_requested;

  useEffect(() => {
    if (error?.message) {
      message.error(String(error?.message));
    }
  }, [error]);

  useEffect(() => {
    if (value?.is_success) {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: 'Requested successfully',
      });
    }
  }, [value?.is_success]);

  const { isDarkTheme } = useThemeMode();

  return (
    <Wrapper isDarkMode={isDarkTheme}>
      <div className="header-bg" />
      <div className="body">
        <PageHeader
          className="pt-[24px]"
          canBack={false}
          closeable
          closeCn="brightness-[10]"
        >
          <span className="title">
            {t('page.requestDebankTestnetGasToken.title')}
          </span>
        </PageHeader>

        {initLoading && <Loading />}

        <div
          className={clsx(
            'container',
            !mintedRabbyBadge && 'mintedRabbyBadge',
            initLoading && 'hidden'
          )}
        >
          <CurrentAccount />
          {mintedRabbyBadge ? (
            <div className="tip">
              {t('page.requestDebankTestnetGasToken.mintedTip')}
            </div>
          ) : (
            <>
              <div className="badgeTip">
                <ThemeIcon
                  src={RcIconInfo}
                  className="w-16 text-r-neutral-title1"
                />
                <span>
                  {t('page.requestDebankTestnetGasToken.notMintedTip')}
                </span>
              </div>
              <Button
                className="claimBtn"
                type="primary"
                block
                onClick={() => setBadgeModalVisible(true)}
              >
                {t('page.requestDebankTestnetGasToken.claimBadgeBtn')}
              </Button>
            </>
          )}
          <div className="faucetBox">
            <ThemeIcon
              src={
                !isDarkTheme ? RcImgDeBankTestnetLight : RcImgDeBankTestnetDark
              }
              className="title"
            />
            <img src={imgUsd} className="usd" />
            <div className="value">0.1 USD</div>
            <div className="time">
              {t('page.requestDebankTestnetGasToken.time')}
            </div>

            {requested ? (
              <div className="requestedTip">
                {t('page.requestDebankTestnetGasToken.requested')}
              </div>
            ) : (
              <Button
                block
                className="requestBtn"
                type="primary"
                disabled={!mintedRabbyBadge || loading}
                onClick={requestFaucet}
              >
                <span>{t('page.requestDebankTestnetGasToken.requestBtn')}</span>{' '}
                {loading && (
                  <img src={imgLoading} className="animate-spin w-14" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      <ClaimRabbyBadgeModal
        visible={badgeModalVisible}
        onCancel={() => {
          setBadgeModalVisible(false);
        }}
        onClaimed={onMinted}
      />
    </Wrapper>
  );
};

export default RequestDeBankTestnetGasToken;
