import React from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { BalanceChange as IBalanceChange } from 'background/service/openapi';
import { splitNumberByStep } from 'ui/utils/number';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';

import LessPalette from '@/ui/style/var-defs';
import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import useBalanceChange from '@/ui/hooks/useBalanceChange';
import IconUnknown from 'ui/assets/token-default.svg';
import IconMore from 'ui/assets/more.svg';
import { ReactComponent as IconRcWarning } from 'ui/assets/icon-warning.svg';
import BigNumber from 'bignumber.js';

const NFTListCountLimit = 7;
const NFCBalanceChangeWrapper = styled.div`
  .nft-balance-change {
    display: flex;
    align-items: center;
  }
  .nft-balance-change-count {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: #13141a;
  }
  .nft-bc-image-list {
    margin: 0;
    padding: 0;
    margin-bottom: 2px;
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    margin-right: 12px;
    gap: 4px;
  }

  .nft-item-container {
    color: ${LessPalette['@color-body']};
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-shrink: 0;
    position: relative;
  }

  .nft-item-container {
    .nft-item-avatar {
      width: 100%;
      height: 100%;
      border: none;
    }

    &:not(.is-extra-item):hover .nft-item-wrapper .nft-item-avatar {
      border-color: ${LessPalette['@primary-color']};
    }
  }

  .nft-item-wrapper {
    display: block;
    width: 28px;
    height: 28px;
    position: relative;
    overflow: hidden;
    border-radius: 2px;

    .nft-extra-item-mask {
      background-color: rgba(0, 0, 0, 0.6);
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: default;
    }
  }

  .nft-item-container + .nft-item-container {
    // padding-left: 8px;
  }

  .nft-item-container.is-extra-item .nft-inner-hover-mask {
    display: none;
  }

  .nft-detail-anchor {
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;

    .nft-supplycount-badge {
      min-width: 21px;
      height: 14px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 2px;
      position: absolute;
      top: 4px;
      right: 4px;
      padding-left: 2px;
      padding-right: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    }

    .nft-inner-hover-mask {
      background-color: transparent;
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    &:hover .nft-inner-hover-mask {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }

  .nft-bc-title {
    font-weight: 400;
    font-size: 14px;
    line-height: 16px;
  }

  .nft-avatar {
    background-color: rgb(204, 204, 204);
  }

  .nft-bc-section + .nft-bc-section {
    margin-top: 20px;
  }

  .nft-bc-section.transfered-out {
    .nft-bc-title {
      color: #ec5151;
    }

    .nft-bc-content {
      background: rgba(236, 81, 81, 0.1);
      border-width: 0;
      border-radius: 6px;
    }
  }
  .nft-bc-section.received {
    .nft-bc-title {
      color: #27c193;
    }

    .nft-bc-content {
      background: ${LessPalette['@color-bg']};
      border: 1px solid ${LessPalette['@color-border']};
      border-radius: 6px;
    }
  }

  .nft-balance-change-error {
    width: 100%;
    font-size: 14px;
    line-height: 16px;
    color: #4b4d59;
  }
`;

function NFTList({
  list,
}: {
  list?: IBalanceChange['send_nft_list'] | IBalanceChange['receive_nft_list'];
}) {
  if (!list?.length) return null;

  const [focusingNFT, setFocusingNFT] = React.useState<
    typeof list[number] | null
  >(null);

  const restCount = Math.max(0, list.length - NFTListCountLimit);

  return (
    <>
      <div className="nft-bc-image-list">
        {list.map((nft, idx) => {
          if (idx > NFTListCountLimit) return null;
          const isExtraItem = idx === NFTListCountLimit;

          return (
            <div
              key={nft.id}
              className={clsx(
                'nft-item-container',
                isExtraItem && 'is-extra-item'
              )}
            >
              <div className="nft-item-wrapper">
                {isExtraItem && restCount && (
                  <div className="nft-extra-item-mask">
                    <img src={IconMore} alt="" />
                  </div>
                )}
                <span
                  title={nft.name}
                  className="nft-detail-anchor"
                  onClick={() => {
                    setFocusingNFT(nft);
                  }}
                >
                  <div className="nft-inner-hover-mask">
                    {(nft.amount || 0) > 1 && (
                      <span className="nft-supplycount-badge">
                        x {nft.amount}
                      </span>
                    )}
                  </div>
                  <NFTAvatar
                    onPreview={() => setFocusingNFT(nft)}
                    className="nft-item-avatar"
                    thumbnail
                    content={nft?.content}
                    type={nft?.content_type}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {focusingNFT && (
        <ModalPreviewNFTItem
          nft={focusingNFT}
          onCancel={() => setFocusingNFT(null)}
        />
      )}
    </>
  );
}

const NFTBalanceChange = ({
  data,
  isSupport,
  chainEnum,
  type,
}: {
  data: IBalanceChange;
  isSupport: boolean;
  chainEnum: CHAINS_ENUM;
  type: 'receive' | 'send';
}) => {
  const { t } = useTranslation();

  const {
    hasReceives,
    countReceives,
    receiveNftList,
    hasTransferedOut,
    countSendNft,
    sendNftList,
  } = React.useMemo(() => {
    const sendNftList = data.send_nft_list.slice(0);
    const countSendNft = sendNftList.reduce(
      (accu, item) => accu + (item.amount || 0),
      0
    );
    const hasTransferedOut = sendNftList.length > 0;

    const receiveNftList = data.receive_nft_list.slice(0);
    const countReceives = receiveNftList.reduce(
      (accu, item) => accu + (item.amount || 0),
      0
    );
    const hasReceives = receiveNftList.length > 0;

    return {
      hasReceives,
      countReceives,
      receiveNftList,
      hasTransferedOut,
      countSendNft,
      sendNftList,
    };
  }, [data]);

  const chain = CHAINS[chainEnum];

  if (type === 'receive' && hasReceives) {
    return (
      <NFCBalanceChangeWrapper className="nft-balance-change">
        <div className="nft-balance-change">
          <NFTList list={receiveNftList} />
          <div className="nft-balance-change-count">
            + {countReceives} {countReceives > 1 ? t('NFTs') : t('NFT')}
          </div>
        </div>
      </NFCBalanceChangeWrapper>
    );
  }
  if (type === 'send' && hasTransferedOut) {
    return (
      <NFCBalanceChangeWrapper className="nft-balance-change">
        <div className="nft-balance-change">
          <NFTList list={sendNftList} />
          <div className="nft-balance-change-count">
            - {countSendNft} {countSendNft > 1 ? t('NFTs') : t('NFT')}
          </div>
        </div>
      </NFCBalanceChangeWrapper>
    );
  }
  return null;
};

const BalanceChange = ({
  data,
  isSupport,
  isGnosis,
  chainEnum,
  version,
}: {
  data: IBalanceChange;
  isSupport: boolean;
  isGnosis?: boolean;
  chainEnum: CHAINS_ENUM;
  version: 'v0' | 'v1' | 'v2';
}) => {
  const { t } = useTranslation();
  const isSuccess = data.success;

  const handleLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknown;
  };

  const { hasTokenChange, hasNFTChange } = useBalanceChange({
    balance_change: data,
  });

  const hasChange = hasNFTChange || hasTokenChange;

  const {
    receiveTokenList,
    sendTokenList,
    isUSDValueChangePositive,
    isUSDValueChangeNegative,
    isShowTotalBalanceChange,
  } = React.useMemo(() => {
    const receiveTokenList = data.receive_token_list;
    const sendTokenList = data.send_token_list;
    const isUSDValueChangePositive = data.usd_value_change > 0;
    const isUSDValueChangeNegative = data.usd_value_change < 0;

    const isShowTotalBalanceChange =
      (data?.receive_token_list.length || 0) +
        (data?.send_token_list.length || 0) >
        1 &&
      (data?.receive_nft_list.length || 0) +
        (data?.send_nft_list.length || 0) <=
        0;

    return {
      receiveTokenList,
      sendTokenList,
      isUSDValueChangePositive,
      isUSDValueChangeNegative,
      isShowTotalBalanceChange,
    };
  }, [data]);

  if (version === 'v0') {
    return null;
  }

  if (version === 'v1' && data.error) {
    return (
      <div className="token-balance-change">
        <div className="balance-change-error items-center">
          <IconRcWarning className="balance-change-error-icon"></IconRcWarning>
          <div className="balance-change-error-content">
            <div className="balance-change-error-title">
              Fail to fetch balance change
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'token-balance-change',
        !hasChange && 'no-change-detected'
      )}
    >
      {!hasChange && !data.error && !isGnosis && (
        <p className="section-title flex flex-start items-center">
          <span className="mr-[3px]">{t('No balance change found')}</span>
        </p>
      )}
      {!hasChange && !data.error && isGnosis && (
        <p className="section-title flex flex-start items-center">
          <span className="mr-[3px]">
            {t('You are signing to submit a Safe transaction')}
          </span>
        </p>
      )}
      {isSuccess && hasChange && (
        <div className="token-balance-change-content">
          <div className="token-balance-change-content-header">
            <span>{t('Est. balance change')}</span>
            {isShowTotalBalanceChange ? (
              <span
                className="token-change-total"
                title={new BigNumber(data.usd_value_change).toFixed()}
              >
                {isUSDValueChangePositive ? '+' : '-'} $
                {splitNumberByStep(Math.abs(data.usd_value_change).toFixed(2))}
              </span>
            ) : null}
          </div>
          <div>
            <div className="token-change-list">
              {sendTokenList &&
                sendTokenList.length > 0 &&
                sendTokenList.map((token) => (
                  <div key={token.id} className="token-change-item">
                    <img
                      src={token.logo_url || IconUnknown}
                      className="token-change-logo"
                      alt=""
                      onError={handleLogoLoadFailed}
                    />
                    <span
                      className="token-change-amount"
                      title={`${splitNumberByStep(
                        new BigNumber(
                          new BigNumber(token.amount).toFixed(9)
                        ).toFixed()
                      )} ${token.symbol}`}
                    >
                      -{' '}
                      {splitNumberByStep(
                        new BigNumber(
                          new BigNumber(token.amount).toFixed(9)
                        ).toFixed()
                      )}{' '}
                      {token.symbol}
                    </span>
                    <span
                      className="token-change-price"
                      title={splitNumberByStep(token.usd_value!.toFixed(2))}
                    >
                      - ${splitNumberByStep(token.usd_value!.toFixed(2))}
                    </span>
                  </div>
                ))}
              <NFTBalanceChange
                type="send"
                data={data}
                isSupport={isSupport}
                chainEnum={chainEnum}
              ></NFTBalanceChange>
              {receiveTokenList &&
                receiveTokenList.length > 0 &&
                receiveTokenList.map((token) => (
                  <div key={token.id} className="token-change-item">
                    <img
                      src={token.logo_url || IconUnknown}
                      className="token-change-logo"
                      alt=""
                      onError={handleLogoLoadFailed}
                    />
                    <span
                      className="token-change-amount"
                      title={`${new BigNumber(token.amount).toFixed()} ${
                        token.symbol
                      }`}
                    >
                      +{' '}
                      {splitNumberByStep(
                        new BigNumber(
                          new BigNumber(token.amount).toFixed(9)
                        ).toFixed()
                      )}{' '}
                      {token.symbol}
                    </span>
                    <span
                      className="token-change-price"
                      title={new BigNumber(token.usd_value || 0).toFixed()}
                    >
                      + ${splitNumberByStep(token.usd_value!.toFixed(2))}
                    </span>
                  </div>
                ))}
              <NFTBalanceChange
                type="receive"
                data={data}
                isSupport={isSupport}
                chainEnum={chainEnum}
              ></NFTBalanceChange>
            </div>
          </div>
        </div>
      )}
      {!data.success && (
        <div className="balance-change-error">
          <IconRcWarning className="balance-change-error-icon"></IconRcWarning>
          <div className="balance-change-error-content">
            <div className="balance-change-error-title">
              Fail to fetch balance change
            </div>
            {data.error && (
              <div className="balance-change-error-desc">
                {data.error.msg} #{data.error.code}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceChange;
