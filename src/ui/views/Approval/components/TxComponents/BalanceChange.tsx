import React from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import { useTranslation, Trans } from 'react-i18next';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { BalanceChange as IBalanceChange } from 'background/service/openapi';
import { splitNumberByStep } from 'ui/utils/number';
import { Tooltip } from 'antd';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import IconQuestion from 'ui/assets/approval/question.svg';

import LessPalette from '@/ui/style/var-defs';
import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import useBalanceChange from '@/ui/hooks/useBalanceChange';

const NFTListCountLimit = 5;
const NFCBalanceChangeWrapper = styled.div`
  .nft-bc-content {
    padding: 12px 16px;
    .nft-bc-image-list {
      margin: 0;
      padding: 0;
      margin-bottom: 2px;
      position: relative;
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
    }
  }

  .nft-item-container {
    color: ${LessPalette['@color-body']};
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-shrink: 0;
    max-width: ${(1 / (NFTListCountLimit + 1)) * 100}%;
    position: relative;
  }

  .nft-item-container {
    .nft-item-avatar {
      width: 100%;
      height: 100%;
      border: 1px solid #ffffff;
    }

    &:not(.is-extra-item):hover .nft-item-wrapper .nft-item-avatar {
      border-color: ${LessPalette['@primary-color']};
    }
  }

  .nft-item-wrapper {
    display: block;
    width: 48px;
    height: 48px;
    position: relative;
    overflow: hidden;
    border-radius: 4px;

    .nft-extra-item-mask {
      background-color: rgba(0, 0, 0, 0.8);
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
    padding-left: 8px;
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
      width: 21px;
      height: 14px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 2px;
      position: absolute;
      top: 4px;
      right: 4px;
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

  .nft-balance-change_error {
    width: 100%;
    background: rgba(242, 156, 27, 0.1);
    border-radius: 4px;
    color: #f29c1b;
    border: 1px solid rgba(242, 156, 27, 0.2);
    font-size: 14px;
    padding: 14px 16px;
    word-break: break-all;
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
                  <div className="nft-extra-item-mask">+ {restCount}</div>
                )}
                <span
                  title={nft.name}
                  className="nft-detail-anchor"
                  onClick={() => {
                    setFocusingNFT(nft);
                  }}
                >
                  <div className="nft-inner-hover-mask">
                    {nft.total_supply > 1 && (
                      <span className="nft-supplycount-badge">
                        x {nft.total_supply}
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
}: {
  data: IBalanceChange;
  isSupport: boolean;
  chainEnum: CHAINS_ENUM;
}) => {
  const { t } = useTranslation();
  const isSuccess = (data.success || !data.success) && isSupport;
  const errorMessage = data.err_msg;

  const {
    hasReceives,
    countReceives,
    receiveNftList,
    hasChange,
    hasTransferedOut,
    countSendNft,
    sendNftList,
  } = React.useMemo(() => {
    const sendNftList = data.send_nft_list.slice(0);
    const countSendNft = sendNftList.reduce(
      (accu, item) => accu + item.total_supply,
      0
    );
    const hasTransferedOut = sendNftList.length > 0;

    const receiveNftList = data.receive_nft_list.slice(0);
    const countReceives = receiveNftList.reduce(
      (accu, item) => accu + item.total_supply,
      0
    );
    const hasReceives = receiveNftList.length > 0;

    const hasChange = receiveNftList.length > 0 || sendNftList.length > 0;

    return {
      hasReceives,
      countReceives,
      receiveNftList,
      hasTransferedOut,
      countSendNft,
      sendNftList,
      hasChange,
    };
  }, [data]);

  const chain = CHAINS[chainEnum];

  return (
    <NFCBalanceChangeWrapper
      className={clsx('nft-bc', !hasChange && 'no-change-detected')}
    >
      {!hasChange && (
        <p className="section-title flex flex-start items-center">
          <span className="mr-[3px]">
            {t('no nft balance change detected')}
          </span>
          <Tooltip
            placement="bottom"
            overlay={<>Only supports detection of ERC 721 and ERC 1155.</>}
            overlayClassName="disable-ant-overwrite"
            overlayInnerStyle={{
              fontSize: '12px',
              lineHeight: '14px',
              padding: '6px 10px',
            }}
          >
            <img className="w-[9.5px] h-[9.5px]" src={IconQuestion} />
          </Tooltip>
        </p>
      )}
      {isSuccess && hasReceives && (
        <div className="nft-bc-section received">
          <h3 className="nft-bc-title mb-8">
            <Trans
              i18nKey={'ntfWillBeReceived'}
              values={{
                countDesc:
                  countReceives > 1 ? `${countReceives} NFTs` : '1 NFT',
              }}
            />
          </h3>
          <div className="gray-section-block nft-bc-content">
            {<NFTList list={receiveNftList} />}
          </div>
        </div>
      )}
      {isSuccess && hasTransferedOut && (
        <div className="nft-bc-section transfered-out">
          <h3 className="nft-bc-title mb-8">
            <Trans
              i18nKey={'ntfWillBeTransferedOut'}
              values={{
                countDesc: countSendNft > 1 ? `${countSendNft} NFTs` : '1 NFT',
              }}
            />
          </h3>
          <div className="gray-section-block nft-bc-content">
            <NFTList list={sendNftList} />
          </div>
        </div>
      )}
      {!isSuccess && (
        <div className="nft-balance-change_error">
          {!data.success ? (
            errorMessage
          ) : (
            <Trans
              i18nKey="balanceChangeNotSupport"
              values={{ name: chain.name }}
            />
          )}
        </div>
      )}
    </NFCBalanceChangeWrapper>
  );
};

const TokenBalanceChange = ({
  data,
  isSupport,
  chainEnum,
}: {
  data: IBalanceChange;
  isSupport: boolean;
  chainEnum: CHAINS_ENUM;
}) => {
  const { t } = useTranslation();
  const isSuccess = data.success && isSupport;
  const errorMessage = data.err_msg;
  const chain = CHAINS[chainEnum];

  const {
    receiveTokenList,
    sendTokenList,
    isUSDValueChangePositive,
    isUSDValueChangeNegative,
    hasChange,
  } = React.useMemo(() => {
    const receiveTokenList = data.receive_token_list;
    const sendTokenList = data.send_token_list;
    const isUSDValueChangePositive = data.usd_value_change > 0;
    const isUSDValueChangeNegative = data.usd_value_change < 0;
    const hasChange =
      data.receive_token_list.length > 0 || data.send_token_list.length > 0;
    return {
      receiveTokenList,
      sendTokenList,
      isUSDValueChangePositive,
      isUSDValueChangeNegative,
      hasChange,
    };
  }, [data]);

  return (
    <div className={clsx('balance-change', !hasChange && 'no-change-detected')}>
      {hasChange ? (
        <p className="section-title flex justify-between">
          <span>{t('token balance change')}</span>
        </p>
      ) : (
        <p className="section-title flex flex-start items-center">
          <span className="mr-[3px]">
            {t('no token balance change detected')}
          </span>
        </p>
      )}
      {isSuccess && hasChange && (
        <div className="gray-section-block balance-change-content">
          <div>
            {sendTokenList && sendTokenList.length > 0 && (
              <ul>
                {sendTokenList.map((token) => (
                  <li key={token.id}>
                    <div className="first-line">
                      <span className="token-symbol" title={token.symbol}>
                        {token.symbol}
                      </span>
                      <span
                        className="token-amount"
                        title={`- ${splitNumberByStep(token.amount)}`}
                      >
                        -{splitNumberByStep(token.amount)}
                      </span>
                    </div>
                    <div className="second-line">
                      ${splitNumberByStep(token.usd_value!.toFixed(2))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {receiveTokenList && receiveTokenList.length > 0 && (
              <ul>
                {receiveTokenList.map((token) => (
                  <li key={token.id}>
                    <div className="first-line">
                      <span className="token-symbol" title={token.symbol}>
                        {token.symbol}
                      </span>
                      <span
                        className="token-amount"
                        title={`+ ${splitNumberByStep(token.amount)}`}
                      >
                        +{splitNumberByStep(token.amount)}
                      </span>
                    </div>
                    <div className="second-line">
                      ${splitNumberByStep(token.usd_value!.toFixed(2))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="total-balance-change">
            <span className="token-symbol">{t('Total value change')}</span>
            <span
              className={clsx('usd-value-change', {
                'text-gray-subTitle': !data.usd_value_change,
                green: isUSDValueChangePositive,
                red: isUSDValueChangeNegative,
              })}
              title={splitNumberByStep(data.usd_value_change)}
            >
              {isUSDValueChangePositive ? '+' : '-'}$
              {splitNumberByStep(Math.abs(data.usd_value_change).toFixed(2))}
            </span>
          </div>
        </div>
      )}
      {!isSuccess && (
        <div className="balance-change_error">
          {!data.success ? (
            errorMessage
          ) : (
            <Trans
              i18nKey="balanceChangeNotSupport"
              values={{ name: chain.name }}
            />
          )}
        </div>
      )}
    </div>
  );
};

function BalanceChange({
  data,
  isSupport,
  chainEnum,
}: {
  data: IBalanceChange;
  isSupport: boolean;
  chainEnum: CHAINS_ENUM;
}) {
  const bcInfo = useBalanceChange({ balance_change: data });

  return (
    <>
      {bcInfo.renderBlocks.map((block, idx) => {
        switch (block) {
          case 'nft-bc':
            return (
              <NFTBalanceChange
                key={`b-${block}-${idx}`}
                data={data}
                isSupport={isSupport}
                chainEnum={chainEnum}
              />
            );
          case 'token-bc':
            return (
              <TokenBalanceChange
                key={`b-${block}-${idx}`}
                data={data}
                isSupport={isSupport}
                chainEnum={chainEnum}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}

export default BalanceChange;
