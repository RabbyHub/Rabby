import { IconOpenSea } from '@/ui/assets';
import { RcIconFindCC } from '@/ui/assets/desktop/common';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useTokenInfo } from '@/ui/hooks/useTokenInfo';
import {
  formatTokenAmount,
  formatUsdValue,
  isSameAddress,
  useWallet,
} from '@/ui/utils';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { findChain } from '@/utils/chain';
import { calcBestOfferPrice } from '@/utils/nft';
import {
  CollectionList,
  NFTDetail,
  NFTItem,
  NFTListingOrder,
} from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { Button, Modal, ModalProps, Skeleton, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { useNFTTradingConfig } from '../hooks/useNFTTradingConfig';
import { EndTime } from './EndTime';
import IconDefaultNFT from '@/ui/assets/default-nft.svg';
import { useNFTListingOrders } from '../hooks/useNFTListingOrders';
import { useTranslation } from 'react-i18next';

type Props = ModalProps & {
  nft?: NFTItem;
  collection?: Omit<CollectionList, 'nft_list'>;
  onCreateListing?: (args: {
    nftDetail: NFTDetail;
    listingOrders?: NFTListingOrder[];
  }) => void;
  onSend?: () => void;
  onAccept?: (args: {
    nftDetail: NFTDetail;
    listingOrders?: NFTListingOrder[];
  }) => void;
  onCancelListing?: (args: {
    nftDetail: NFTDetail;
    listingOrders?: NFTListingOrder[];
  }) => void;
  onEditListing?: (args: {
    nftDetail: NFTDetail;
    listingOrders?: NFTListingOrder[];
  }) => void;
};

const Content: React.FC<Props> = (props) => {
  const {
    nft,
    collection,
    onCreateListing,
    onSend,
    onAccept,
    onCancelListing,
    onEditListing,
    ...rest
  } = props;
  const wallet = useWallet();
  const chain = findChain({ serverId: nft?.chain });
  const currentAccount = useCurrentAccount();
  const nftTradingConfig = useNFTTradingConfig();
  const { t } = useTranslation();

  const {
    data: nftDetail,
    loading: isLoadingDetail,
    runAsync: runGetNFTDetail,
  } = useRequest(
    async () => {
      if (!nft?.id || !nft?.chain || !currentAccount) {
        return null;
      }
      const res = await wallet.openapi.getNFTDetail({
        chain_id: nft?.chain,
        id: nft?.id,
        user_addr: currentAccount?.address,
      });
      return res;
    },
    {
      refreshDeps: [nft?.id, nft?.chain, currentAccount?.address],
      ready: !!(nft?.chain && nftTradingConfig?.[nft?.chain]),
    }
  );

  const {
    data: listingOrdersRes,
    loading: isLoadingListing,
  } = useNFTListingOrders({
    maker: currentAccount?.address,
    chain_id: nftDetail?.chain,
    collection_id: nftDetail?.contract_id,
    inner_id: nftDetail?.inner_id,
  });

  const loading = isLoadingDetail || isLoadingListing;

  const offerToken = useTokenInfo(
    {
      address: currentAccount?.address,
      chainServerId: nftDetail?.chain,
      tokenId: nftDetail
        ? nftTradingConfig?.[nftDetail?.chain]?.offer_currency?.token_id
        : '',
    },
    {
      ready: !!nftDetail?.best_offer_order,
    }
  );

  const listingOffer = useMemo(() => {
    return listingOrdersRes?.orders?.[0];
  }, [listingOrdersRes]);

  const listingToken = useTokenInfo(
    {
      address: currentAccount?.address,
      chainServerId: nftDetail?.chain,
      tokenId: nftDetail
        ? nftTradingConfig?.[nftDetail?.chain]?.listing_currency?.token_id
        : '',
    },
    {
      ready: !!listingOffer,
    }
  );

  const bestOfferPrice = useMemo(() => {
    return calcBestOfferPrice(nftDetail);
  }, [nftDetail]);

  const bestOfferUsdPrice = useMemo(() => {
    if (!bestOfferPrice || !offerToken) {
      return null;
    }
    return bestOfferPrice.times(offerToken.price);
  }, [offerToken, bestOfferPrice]);

  return (
    <>
      <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
        {nft?.name || '-'}
      </h1>
      <div className="px-[20px] pb-[20px]">
        <div className="flex items-start gap-[16px]">
          <div className="relative flex-shrink-0">
            <NFTAvatar
              className="w-[340px] h-[340px]"
              type={nft?.content_type}
              // amount={nft?.amount}
              content={nft?.content}
              empty={
                <div className="w-[340px] h-[340px] bg-r-neutral-line flex items-center justify-center rounded-[8px]">
                  <div className="text-[40px] leading-[48px] font-semibold text-r-neutral-foot">
                    {t('page.desktopProfile.nft.detail.nft')}
                  </div>
                </div>
              }
            />

            {nft?.amount && nft?.amount > 1 ? (
              <div
                className={clsx(
                  'absolute top-[8px] right-[8px]',
                  'rounded-[4px] py-[3px] px-[10px]',
                  'text-r-neutral-title2 font-medium text-[15px] leading-[18px]',
                  'bg-[rgba(0,0,0,0.5)]'
                )}
              >
                x{nft.amount}
              </div>
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="border-[0.5px] border-solid border-rabby-neutral-line rounded-[8px]">
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  {t('page.desktopProfile.nft.detail.collection')}
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  {collection?.name || '-'}
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  {t('page.desktopProfile.nft.detail.chain')}
                </div>
                <div className="flex items-center gap-[6px]">
                  <img src={chain?.logo} className="w-[16px] h-[16px]" alt="" />
                  <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                    {chain?.name || '-'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  {t('page.desktopProfile.nft.detail.collectionFloor')}
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  {loading ? (
                    <Skeleton.Input
                      active
                      className="w-[120px] h-[16px] rounded-[4px] block"
                    />
                  ) : (
                    <>
                      {nftDetail?.collection?.opensea_floor_price ? (
                        <>
                          {formatTokenAmount(
                            nftDetail?.collection?.opensea_floor_price?.price ||
                              0
                          )}{' '}
                          {
                            nftDetail?.collection?.opensea_floor_price?.token
                              ?.symbol
                          }{' '}
                          (
                          {formatUsdValue(
                            new BigNumber(
                              nftDetail?.collection?.opensea_floor_price?.price
                            )
                              .times(
                                nftDetail?.collection?.opensea_floor_price
                                  ?.token?.price
                              )
                              .toString()
                          )}
                          )
                        </>
                      ) : (
                        '-'
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  {t('page.desktopProfile.nft.detail.rarity')}
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  {loading ? (
                    <Skeleton.Input
                      active
                      className="w-[120px] h-[16px] rounded-[4px] block"
                    />
                  ) : (
                    <>
                      {nftDetail?.rarity?.rank
                        ? `#${nftDetail?.rarity?.rank}`
                        : '-'}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  {t('page.desktopProfile.nft.detail.lastSale')}
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  {loading ? (
                    <Skeleton.Input
                      active
                      className="w-[120px] h-[16px] rounded-[4px] block"
                    />
                  ) : (
                    <>
                      {nftDetail?.last_sale ? (
                        <>
                          {formatTokenAmount(
                            new BigNumber(nftDetail.last_sale.payment.quantity)
                              .div(
                                new BigNumber(10).exponentiatedBy(
                                  nftDetail.last_sale.payment.decimals
                                )
                              )
                              .toString()
                          )}{' '}
                          {nftDetail.last_sale.payment.symbol}{' '}
                          <span className="text-r-neutral-foot font-normal">
                            (
                            {formatUsdValue(
                              new BigNumber(
                                nftDetail.last_sale.payment.quantity
                              )
                                .div(
                                  new BigNumber(10).exponentiatedBy(
                                    nftDetail.last_sale.payment.decimals
                                  )
                                )
                                .times(nftDetail.last_sale.payment.price)
                                .toString()
                            )}
                            )
                          </span>
                        </>
                      ) : (
                        '-'
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-[15px]">
              <header className="flex items-center justify-between mb-[8px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium">
                  {t('page.desktopProfile.nft.detail.topOffer')}
                </div>
                {collection?.is_tradable ? (
                  <div className="flex items-center gap-[6px]">
                    <div className="text-r-neutral-foot text-[12px] leading-[14px]">
                      {t('page.desktopProfile.nft.detail.supportPlatform')}{' '}
                    </div>
                    <div>
                      <Tooltip title="OpenSea" overlayClassName="rectangle">
                        <img
                          src={IconOpenSea}
                          className="w-[16px] h-[16px]"
                          alt="OpenSea"
                        />
                      </Tooltip>
                    </div>
                  </div>
                ) : null}
              </header>

              <div
                className={clsx(
                  'py-[13px] px-[12px] rounded-[8px] h-[60px]',
                  'border-[0.5px] border-solid border-rabby-neutral-line'
                )}
              >
                {loading ? (
                  <div className="flex items-center h-full">
                    <Skeleton.Input
                      active
                      className="w-[120px] h-[16px] rounded-[4px] block"
                    />
                  </div>
                ) : nftDetail?.best_offer_order ? (
                  <div className="flex items-center justify-between gap-[8px]">
                    <div className="space-y-[4px]">
                      <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
                        {bestOfferPrice
                          ? formatTokenAmount(bestOfferPrice.toString())
                          : '-'}{' '}
                        {nftDetail.best_offer_order.price.currency}
                        <span className="text-r-neutral-foot font-normal">
                          (
                          {bestOfferUsdPrice
                            ? formatUsdValue(bestOfferUsdPrice.toString())
                            : '-'}
                          )
                        </span>
                      </div>
                      <div
                        className={clsx(
                          'flex items-center gap-[6px]',
                          'text-[11px] leading-[13px] text-r-neutral-foot'
                        )}
                      >
                        <div>
                          {t('page.desktopProfile.nft.detail.ending')}{' '}
                          <EndTime
                            end={
                              +nftDetail.best_offer_order.protocol_data
                                .parameters.endTime
                            }
                          />
                        </div>
                        <div className="w-[0.5px] h-[10px] bg-r-neutral-line" />
                        <div>
                          {t('page.desktopProfile.nft.detail.platform')}{' '}
                        </div>
                        <div className="flex items-center gap-[2px]">
                          <img
                            src={IconOpenSea}
                            className="w-[12px] h-[12px]"
                            alt=""
                          />
                          OpenSea
                        </div>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        className={clsx(
                          'rounded-[4px] bg-r-blue-light1 py-[8px] px-[16px]',
                          'text-r-blue-default text-[13px] leading-[16px] font-medium'
                        )}
                        onClick={() => {
                          if (!nftDetail) {
                            return;
                          }
                          onAccept?.({
                            nftDetail,
                            listingOrders: listingOrdersRes?.orders,
                          });
                        }}
                      >
                        {t('page.desktopProfile.nft.detail.accept')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-[4px] h-full">
                    <RcIconFindCC className="text-r-neutral-foot" />
                    <div className="text-[11px] leading-[13px] text-r-neutral-foot">
                      {t('page.desktopProfile.nft.detail.noOffer')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <footer>
          {listingOffer ? (
            <div
              className={clsx(
                'rounded-[8px] p-[15px] mt-[16px]',
                'border-solid border-[1px] border-rabby-green-default'
              )}
            >
              <div className="flex items-center gap-[6px]">
                <img
                  src={IconOpenSea}
                  className="w-[16px] h-[16px] rounded-full"
                />
                <div className="text-[13px] leading-[16px] font-medium text-r-green-default">
                  {t('page.desktopProfile.nft.detail.listing')}
                </div>
              </div>
              <div className="mt-[8px] flex items-center gap-[6px]">
                {listingToken ? (
                  <>
                    <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title1">
                      {formatTokenAmount(
                        new BigNumber(listingOffer.current_price)
                          .div(
                            new BigNumber(10).exponentiatedBy(
                              listingToken?.decimals
                            )
                          )
                          .div(
                            listingOffer.protocol_data?.parameters?.offer?.[0]
                              .startAmount || 1
                          )
                          .toString()
                      )}{' '}
                      {listingToken?.symbol}
                    </div>
                    <div className="text-[15px] leading-[18px] text-r-neutral-foot">
                      {formatUsdValue(
                        new BigNumber(listingOffer.current_price)
                          .div(
                            new BigNumber(10).exponentiatedBy(
                              listingToken?.decimals
                            )
                          )
                          .div(
                            listingOffer.protocol_data?.parameters?.offer?.[0]
                              .startAmount || 1
                          )
                          .times(listingToken.price)
                          .toString()
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title1">
                    -
                  </div>
                )}
                <div className="ml-auto text-[15px] leading-[18px] text-r-neutral-foot">
                  {t('page.desktopProfile.nft.detail.ending')}{' '}
                  <EndTime
                    onEnd={runGetNFTDetail}
                    end={+listingOffer.protocol_data.parameters.endTime}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-[24px] flex items-center gap-[12px] pl-[356px]">
            {listingOffer ? (
              <>
                {nftDetail?.collection?.is_erc721 ? (
                  <Button
                    block
                    type="primary"
                    className="rounded-[8px] text-[13px] leading-[16px] font-medium h-[40px]"
                    disabled={!nftDetail || !collection?.is_tradable || loading}
                    onClick={() => {
                      if (!nftDetail) {
                        return;
                      }
                      onEditListing?.({
                        nftDetail,
                        listingOrders: listingOrdersRes?.orders,
                      });
                    }}
                  >
                    {t('page.desktopProfile.nft.detail.edit')}
                  </Button>
                ) : (
                  <Button
                    block
                    type="primary"
                    className="rounded-[8px] text-[13px] leading-[16px] font-medium h-[40px]"
                    disabled={!nftDetail || !collection?.is_tradable || loading}
                    onClick={() => {
                      if (!nftDetail) {
                        return;
                      }
                      onCreateListing?.({
                        nftDetail,
                        listingOrders: listingOrdersRes?.orders,
                      });
                    }}
                  >
                    {t('page.desktopProfile.nft.detail.listing')}
                  </Button>
                )}

                <Button
                  block
                  size="large"
                  ghost
                  disabled={!nftDetail || !collection?.is_tradable || loading}
                  className={clsx(
                    'hover:before:hidden rounded-[8px] text-[13px] leading-[16px] font-medium h-[40px]',
                    'border-blue-light text-blue-light hover:bg-[#8697FF1A] active:bg-[#0000001A] ',
                    'rounded-[8px] before:content-none z-10'
                  )}
                  onClick={() => {
                    if (!nftDetail) {
                      return;
                    }
                    onCancelListing?.({
                      nftDetail,
                      listingOrders: listingOrdersRes?.orders,
                    });
                  }}
                >
                  {t('page.desktopProfile.nft.detail.cancel')}
                </Button>
              </>
            ) : (
              <Button
                block
                type="primary"
                className="rounded-[8px] text-[13px] leading-[16px] font-medium h-[40px]"
                disabled={!nftDetail || !collection?.is_tradable || loading}
                onClick={() => {
                  if (!nftDetail) {
                    return;
                  }
                  onCreateListing?.({
                    nftDetail,
                    listingOrders: listingOrdersRes?.orders,
                  });
                }}
              >
                {t('page.desktopProfile.nft.detail.listing')}
              </Button>
            )}

            <Button
              block
              size="large"
              ghost
              className={clsx(
                'hover:before:hidden rounded-[8px] text-[13px] leading-[16px] font-medium h-[40px]',
                'border-blue-light text-blue-light hover:bg-[#8697FF1A] active:bg-[#0000001A] ',
                'rounded-[8px] before:content-none z-10'
              )}
              onClick={() => {
                onSend?.();
              }}
            >
              {t('page.desktopProfile.nft.detail.send')}
            </Button>
          </div>
        </footer>
      </div>
    </>
  );
};
export const NFTDetailModal: React.FC<Props> = (props) => {
  return (
    <Modal
      {...props}
      width={796}
      centered
      footer={null}
      bodyStyle={{
        maxHeight: 'unset',
        padding: 0,
      }}
      maskStyle={{
        background: 'rgba(0, 0, 0, 0.30)',
        backdropFilter: 'blur(8px)',
      }}
      className="modal-support-darkmode"
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
      }
      destroyOnClose
    >
      <Content {...props}></Content>
    </Modal>
  );
};
