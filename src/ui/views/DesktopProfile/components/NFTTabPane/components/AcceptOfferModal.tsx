import { IconOpenSea } from '@/ui/assets';
import { RcIconInfoCC, RcIconWaringCC } from '@/ui/assets/desktop/common';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { StepInput } from '@/ui/component/StepInput';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { useTokenInfo } from '@/ui/hooks/useTokenInfo';
import { formatTokenAmount, formatUsdValue, useWallet } from '@/ui/utils';
import { waitForTxCompleted } from '@/ui/utils/transaction';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { findChain } from '@/utils/chain';
import { calcBestOfferPrice } from '@/utils/nft';
import { NFTDetail, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useRequest, useSetState } from 'ahooks';
import { Button, Modal, ModalProps, Switch, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { last } from 'lodash';
import React, { useMemo } from 'react';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { useNFTTradingConfig } from '../hooks/useNFTTradingConfig';
import { OPENSEA_CONDUIT_ADDRESS } from '@opensea/seaport-js/lib/constants';

type Props = ModalProps & {
  nftDetail?: NFTDetail;
  onSigned?(p: Promise<any>): void;
};

const Content: React.FC<Props> = (props) => {
  const { nftDetail, onSigned, ...rest } = props;

  const currentAccount = useCurrentAccount();
  const nftTradingConfig = useNFTTradingConfig();

  const {
    openUI,
    resetGasStore,
    close: closeSign,
    updateConfig,
  } = useMiniSigner({
    account: currentAccount!,
  });

  // const canDirectSign = useMemo(
  //   () => supportedDirectSign(currentAccount?.type || ''),
  //   [currentAccount?.type]
  // );

  const canDirectSign = false;

  const [formValues, setFormValues] = useSetState<{
    listingPrice?: string;
    amount: number | null;
    creatorFeeEnable?: boolean;
    duration: number;
  }>({
    listingPrice: '',
    amount: 1,
    creatorFeeEnable: false,
    duration: 60 * 24 * 60 * 60 * 1000,
  });

  const bestOffer = nftDetail?.best_offer_order;

  const maxCount = useMemo(() => {
    return Math.min(bestOffer?.remaining_quantity || 1, nftDetail?.amount || 1);
  }, [bestOffer?.remaining_quantity, nftDetail?.amount]);

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

  const wallet = useWallet();

  const { data: fees } = useRequest(
    async () => {
      if (!nftDetail?.chain || !nftDetail?.contract_id) {
        return null;
      }
      const res = await wallet.openapi.getNFTCollectionFees({
        chain_id: nftDetail?.chain || '',
        collection_id: nftDetail?.contract_id || '',
        inner_id: nftDetail.inner_id,
      });
      return res;
    },
    {
      refreshDeps: [nftDetail?.chain, nftDetail?.contract_id],
      onError(e) {
        console.error(e);
      },
    }
  );

  const feesRate = useMemo(() => {
    const res = {
      total: 0,
      market: 0,
      custom: 0,
      isCustomRequired: false,
    };
    if (!fees) {
      return res;
    }
    Object.entries(fees).forEach(([key, list]) => {
      list.forEach((item) => {
        if (key === 'marketplace_fees') {
          res.market += item.fee;
          res.total += item.fee;
        } else if (key === 'custom_royalties') {
          res.custom += item.fee;
          if (formValues.creatorFeeEnable || item.required) {
            res.total += item.fee;
          }
          res.isCustomRequired = item.required || res.isCustomRequired;
        }
      });
    });
    return {
      total: res.total / 10000,
      market: res.market / 10000,
      custom: res.custom / 10000,
      isCustomRequired: res.isCustomRequired,
    };
  }, [fees, formValues.creatorFeeEnable]);

  const bestOfferPrice = useMemo(() => {
    return calcBestOfferPrice(nftDetail);
  }, [nftDetail]);

  const bestOfferUsdPrice = useMemo(() => {
    if (!bestOfferPrice || !offerToken) {
      return null;
    }
    return bestOfferPrice.times(offerToken.price);
  }, [offerToken, bestOfferPrice]);

  const floorDiff = useMemo(() => {
    const floorPrice = nftDetail?.collection?.opensea_floor_price?.price || 0;
    // todo： token 不一样？ETH / WETH
    if (!floorPrice || !bestOfferPrice) {
      return null;
    }
    return bestOfferPrice.minus(floorPrice).div(floorPrice).toNumber();
  }, [nftDetail?.collection?.opensea_floor_price?.price, bestOfferPrice]);

  const chain = findChain({
    serverId: nftDetail?.chain,
  });

  const {
    data: isApproved,
    loading: isCheckingApproved,
    runAsync: runCheckIsApproved,
  } = useRequest(
    async () => {
      if (!chain?.id || !currentAccount?.address || !nftDetail) {
        return;
      }
      const isApproved = await wallet.checkIsApprovedForAll({
        chainId: chain.id,
        owner: currentAccount!.address,
        operator: OPENSEA_CONDUIT_ADDRESS,
        contractAddress: nftDetail.contract_id,
      });

      return isApproved;
    },
    {
      refreshDeps: [chain?.id, currentAccount?.address, nftDetail],
    }
  );

  const { data: txs, loading: isBuildingTx, error } = useRequest(
    async () => {
      if (
        !currentAccount ||
        !nftDetail ||
        !currentAccount ||
        !chain ||
        !bestOffer
      ) {
        throw new Error('Error');
      }

      const txs: Tx[] = [];
      const approveTx = isApproved
        ? null
        : await wallet.buildSetApprovedForAllTx({
            from: currentAccount?.address,
            chainId: chain.id,
            operator: OPENSEA_CONDUIT_ADDRESS,
            contractAddress: nftDetail.contract_id,
          });
      const tx = await wallet.buildAcceptNFTOfferTx({
        address: currentAccount!.address,
        chainId: chain!.id,
        collectionId: nftDetail?.contract_id,
        innerId: nftDetail?.inner_id,
        order: bestOffer,
        quantity: formValues.amount || 1,
        isIncludeCreatorFee: formValues.creatorFeeEnable,
      });

      if (approveTx) {
        txs.push(approveTx as Tx);
      }
      txs.push((tx as unknown) as Tx);

      return txs;
    },
    {
      refreshDeps: [
        bestOffer,
        formValues.amount,
        formValues.creatorFeeEnable,
        nftDetail,
        currentAccount?.address,
        chain?.id,
        isApproved,
      ],
      ready: !isCheckingApproved,
    }
  );

  const { runAsync: handleSubmit, loading: isSubmitting } = useRequest(
    async (txs?: Tx[]) => {
      if (!txs?.length) {
        throw new Error('empty tx');
      }
      const runFallback = async () => {
        const res: string[] = [];
        for (const tx of txs) {
          const hash = await wallet.sendRequest<string>({
            method: 'eth_sendTransaction',
            params: [tx],
          });
          res.push(hash);
        }
        return res;
      };

      if (canDirectSign && currentAccount) {
        resetGasStore();
        closeSign();
        const signerConfig = {
          txs,
          title: (
            <div className="flex items-center justify-center gap-[8px]">
              <div className="relative">
                <img src={IconOpenSea} alt="" className="w-[24px] h-[24px]" />
                <img
                  src={chain?.logo}
                  alt=""
                  className="absolute top-[-2px] right-[-2px] w-[12px] h-[12px] rounded-full"
                />
              </div>
              <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title1">
                Sale NFT
              </div>
            </div>
          ),
          showSimulateChange: true,
          disableSignBtn: false,
          onRedirectToDeposit: () => {},
          ga: {},
        } as const;
        try {
          return await openUI(signerConfig);
        } catch (error) {
          console.log('openUI error', error);
          if (error !== MINI_SIGN_ERROR.USER_CANCELLED) {
            console.error('Dapp action direct sign error', error);
            return await runFallback();
          }
          throw error;
        }
      } else {
        return await runFallback();
      }
    },
    {
      manual: true,
      onSuccess(res) {
        const hash = last(res);
        if (chain && hash) {
          onSigned?.(
            waitForTxCompleted({
              wallet,
              hash: hash,
              chainServerId: chain!.serverId,
            })
          );
        }
      },
    }
  );

  return (
    <Modal
      {...rest}
      width={880}
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
      closeIcon={<RcIconCloseCC className="w-[20px] h-[20px]" />}
    >
      <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
        Accept Offer
      </h1>
      <div className="pt-[16px] px-[20px] pb-[24px]">
        <div className="pb-[20px] border-b-[0.5px] border-solid border-rabby-neutral-line">
          <div className="flex items-center justify-between">
            <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
              Offer
            </div>
            <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
              Offer Price
            </div>
          </div>
          <div className="flex items-center gap-[10px] pt-[12px]">
            <NFTAvatar
              className="w-[36px] h-[36px]"
              chain={nftDetail?.chain}
              content={nftDetail?.content}
              type={nftDetail?.content_type}
            />
            <div className="flex-1 min-w-0 flex justify-between gap-[4px]">
              <div className="space-y-[4px]">
                <div
                  className={clsx(
                    'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate'
                  )}
                >
                  {nftDetail?.name || '-'}
                </div>
                <div
                  className={clsx(
                    'text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate'
                  )}
                >
                  {nftDetail?.collection?.name || '-'}
                </div>
              </div>
              <div className="space-y-[4px] text-right">
                {offerToken ? (
                  <>
                    <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 text-right">
                      {bestOfferPrice
                        ? formatTokenAmount(bestOfferPrice.toString())
                        : '-'}{' '}
                      {bestOffer?.price.currency}
                    </div>
                    <div
                      className={clsx(
                        'text-[13px] leading-[16px] font-medium text-r-neutral-foot'
                      )}
                    >
                      {bestOfferUsdPrice
                        ? formatUsdValue(bestOfferUsdPrice.toString())
                        : '-'}
                    </div>
                  </>
                ) : (
                  <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
                    -
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="py-[16px] space-y-[24px] border-b-[0.5px] border-solid border-rabby-neutral-line">
          {maxCount > 1 ? (
            <div className="flex items-center justify-between">
              <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
                Quantity
              </div>
              <div>
                <StepInput
                  min={1}
                  max={maxCount}
                  value={formValues.amount}
                  onChange={(v) => {
                    setFormValues({
                      amount: v,
                    });
                  }}
                  disabled={isSubmitting}
                  // maxTooltip={
                  //   (formValues.amount || 0) >= (nftDetail?.amount || 1)
                  //     ? `Your balance is ${nftDetail?.amount || 1}`
                  //     : undefined
                  // }
                />
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
              Platform
            </div>
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate">
              <div className="flex items-center gap-[4px]">
                <img src={IconOpenSea} className="w-[16px] h-[16px]" alt="" />
                OpenSea
              </div>
            </div>
          </div>
        </div>

        <div className="py-[16px] space-y-[16px] border-b-[0.5px] border-solid border-rabby-neutral-line">
          <div className="flex items-center justify-between">
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot">
              Floor difference
            </div>
            <div
              className={clsx(
                'text-[13px] leading-[16px] font-medium',
                floorDiff && floorDiff < 0
                  ? 'text-r-red-default'
                  : 'text-r-neutral-title1'
              )}
            >
              {floorDiff ? (
                <>
                  {floorDiff < 0
                    ? `${(floorDiff * 100).toFixed(1)}% below floor`
                    : `${(floorDiff * 100).toFixed(1)}% above floor`}
                </>
              ) : (
                '-'
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div
              className={clsx(
                'flex items-center gap-[2px]',
                'text-[13px] leading-[16px] font-medium text-r-neutral-foot'
              )}
            >
              Opensea Platform fees ({+(feesRate.market * 100).toFixed(2)}
              %)
              <Tooltip
                title="This fee is OpenSea's service charge"
                overlayClassName="rectangle"
              >
                <RcIconInfoCC />
              </Tooltip>
            </div>
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate">
              {formatTokenAmount(
                new BigNumber(feesRate.market)
                  .times(bestOfferPrice || 0)
                  .times(formValues?.amount || 0)
                  .toString()
              )}{' '}
              {offerToken?.symbol}{' '}
              <span className="text-r-neutral-foot font-normal">
                (
                {formatUsdValue(
                  new BigNumber(feesRate.market)
                    .times(bestOfferUsdPrice || 0)
                    .times(formValues?.amount || 0)
                    .toString()
                )}
                )
              </span>
            </div>
          </div>
          {feesRate.custom ? (
            <div className="flex items-center justify-between">
              <div
                className={clsx(
                  'flex items-center',
                  'text-[13px] leading-[16px] font-medium text-r-neutral-foot'
                )}
              >
                Creator fees ({+(feesRate.custom * 100).toFixed(2)}%)
                <Tooltip
                  title={
                    feesRate?.isCustomRequired
                      ? 'Creator earnings will be paid by the seller. Creator earnings are enforced'
                      : 'Creator earnings will be paid by the seller.'
                  }
                  overlayClassName="rectangle"
                >
                  <RcIconInfoCC className="ml-[2px] mr-[4px]" />
                </Tooltip>
                {feesRate?.isCustomRequired ? null : (
                  <Switch
                    checked={
                      formValues.creatorFeeEnable || feesRate.isCustomRequired
                    }
                    onChange={(v) => {
                      setFormValues({
                        creatorFeeEnable: v,
                      });
                    }}
                    disabled={isSubmitting}
                  ></Switch>
                )}
              </div>
              <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate">
                {(formValues?.creatorFeeEnable || feesRate.isCustomRequired) &&
                feesRate.custom ? (
                  <>
                    {formatTokenAmount(
                      new BigNumber(feesRate.custom)
                        .times(bestOfferPrice || 0)
                        .times(formValues?.amount || 0)
                        .toString()
                    )}{' '}
                    {offerToken?.symbol}{' '}
                    <span className="text-r-neutral-foot font-normal">
                      (
                      {formatUsdValue(
                        new BigNumber(feesRate.custom)
                          .times(bestOfferUsdPrice || 0)
                          .times(formValues?.amount || 0)
                          .toString()
                      )}
                      )
                    </span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot">
              Rabby fee (0%)
            </div>
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate">
              -
            </div>
          </div>
        </div>
        <div className="py-[16px] mb-[12px]">
          <div className="flex items-center justify-between">
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
              Total est. proceeds
            </div>
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate">
              {formatTokenAmount(
                new BigNumber(bestOfferPrice || 0)
                  .times(1 - feesRate.total)
                  .times(formValues?.amount || 0)
                  .toString()
              )}{' '}
              {offerToken?.symbol}{' '}
              <span className="text-r-neutral-foot font-normal">
                (
                {formatUsdValue(
                  new BigNumber(bestOfferUsdPrice || 0)
                    .times(1 - feesRate.total)
                    .times(formValues?.amount || 0)
                    .toString()
                )}
                )
              </span>
            </div>
          </div>
        </div>
        <footer>
          <div className="flex items-center justify-end gap-[16px]">
            {error ? (
              <div
                className={clsx(
                  'flex items-center gap-[6px]',
                  ' text-r-red-default text-[13px] leading-[16px] font-medium'
                )}
              >
                <RcIconWaringCC
                  viewBox="0 0 24 24"
                  className="w-[16px] h-[16px]"
                />
                <div>{error?.message || 'Something wrong'}</div>
              </div>
            ) : null}
            <Button
              type="primary"
              size="large"
              className="min-w-[180px]"
              loading={isSubmitting}
              disabled={isBuildingTx || !txs?.length}
              onClick={() => {
                handleSubmit(txs);
              }}
            >
              Accept Offer
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
};
export const AcceptOfferModal: React.FC<Props> = (props) => {
  return (
    <Modal
      {...props}
      width={880}
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
      <Content {...props} />
    </Modal>
  );
};
