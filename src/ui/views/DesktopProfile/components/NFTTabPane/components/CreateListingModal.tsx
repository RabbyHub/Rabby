import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import {
  formatPrice,
  formatTokenAmount,
  formatUsdValue,
  isSameAddress,
  useWallet,
} from '@/ui/utils';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { findChain } from '@/utils/chain';
import { NFTDetail, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useMemoizedFn, useRequest, useSetState } from 'ahooks';
import {
  Button,
  Input,
  Modal,
  ModalProps,
  Select,
  Switch,
  Tooltip,
} from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { last, unescape } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNFTTradingConfig } from '../hooks/useNFTTradingConfig';
import { useTokenInfo } from '@/ui/hooks/useTokenInfo';
import NumberInput from '@/ui/component/NFTNumberInput';
import {
  CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
  OPENSEA_CONDUIT_ADDRESS,
  SEAPORT_CONTRACT_VERSION_V1_6,
} from '@opensea/seaport-js/lib/constants';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { StepInput } from '@/ui/component/StepInput';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { calcBestOfferPrice, generateRandomSalt } from '../utils';
import { useMixedSigner } from '@/ui/hooks/useMixedSigner';
import { SignProcessButton } from '@/ui/component/SignProcessButton';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';

const Container = styled.div`
  table {
    td {
      padding: 12px 6px;

      &:first-child {
        padding-left: 0;
      }

      &:not(:first-child) {
        text-align: right;
      }

      &:last-child {
        padding-right: 0;
      }
    }
  }

  .custom-input {
    border-radius: 8px;
    border: 1px solid var(--r-blue-default, #4c65ff);
    height: 40px;
    width: 148px;

    .ant-input {
      color: var(--r-neutral-title1, #192945);
      font-size: 13px;
      line-height: 16px;
      font-weight: 500;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .ant-input-suffix {
      color: var(--r-neutral-foot, #6a7587);
      font-size: 13px;
      line-height: 16px;
      font-weight: 500;
    }
  }

  .custom-select {
    .ant-select-selector {
      border-radius: 8px;
      border: 1px solid var(--r-neutral-line, #e0e5ec);
      width: 160px;
      height: 44px;

      .ant-select-selection-item {
        line-height: 44px;
        color: var(--r-neutral-title1, #192945);
        font-size: 15px;
        font-weight: 500;
      }
    }
    &.ant-select-focused {
      .ant-select-selector {
        border: 1px solid var(--r-blue-default, #4c65ff);
        background: var(--r-blue-light1, #edf0ff);
      }
    }
  }
`;

const options = [
  {
    label: '15 minutes',
    value: 15 * 60 * 1000,
  },
  {
    label: '30 minutes',
    value: 30 * 60 * 1000,
  },
  {
    label: '1 hour',
    value: 60 * 60 * 1000,
  },
  {
    label: '3 hours',
    value: 3 * 60 * 60 * 1000,
  },
  {
    label: '6 hours',
    value: 6 * 60 * 60 * 1000,
  },
  {
    label: '12 hours',
    value: 12 * 60 * 60 * 1000,
  },
  {
    label: '1 day',
    value: 24 * 60 * 60 * 1000,
  },
  {
    label: '3 days',
    value: 3 * 24 * 60 * 60 * 1000,
  },
  {
    label: '7 days',
    value: 7 * 24 * 60 * 60 * 1000,
  },
  {
    label: '30 days',
    value: 30 * 24 * 60 * 60 * 1000,
  },
  {
    label: '60 days',
    value: 60 * 24 * 60 * 60 * 1000,
  },
  {
    label: '6 months',
    value: 6 * 30 * 24 * 60 * 60 * 1000,
  },
];

function findClosestOption(inputMs: number) {
  if (typeof inputMs !== 'number' || inputMs < 0) {
    throw new Error('Input must be a non-negative number');
  }

  // 如果输入为0，返回第一个选项
  if (inputMs === 0) {
    return options[0];
  }

  let closestOption = options[0];
  let minDifference = Math.abs(inputMs - options[0].value);

  for (let i = 1; i < options.length; i++) {
    const difference = Math.abs(inputMs - options[i].value);
    if (difference < minDifference) {
      minDifference = difference;
      closestOption = options[i];
    }
  }

  return closestOption;
}

type Props = ModalProps & {
  nftDetail?: NFTDetail;
  onFailed?(): void;
  onSuccess?(): void;
  isEdit?: boolean;
};

export const Content: React.FC<Props> = (props) => {
  const { nftDetail, onSuccess, onFailed, isEdit, ...rest } = props;
  const currentAccount = useCurrentAccount();
  const nftTradingConfig = useNFTTradingConfig();

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

  const listingToken = useTokenInfo({
    address: currentAccount?.address,
    chainServerId: nftDetail?.chain,
    tokenId: nftDetail
      ? nftTradingConfig?.[nftDetail?.chain]?.listing_currency?.token_id
      : '',
  });

  const wallet = useWallet();

  const { data: fees } = useRequest(
    async () => {
      if (!nftDetail?.chain || !nftDetail?.contract_id) {
        return null;
      }
      const res = await wallet.openapi.getNFTCollectionFees({
        chain_id: nftDetail?.chain || '',
        collection_id: nftDetail?.contract_id || '',
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
          if (formValues.creatorFeeEnable) {
            res.total += item.fee;
          }
        }
      });
    });
    return {
      total: res.total / 10000,
      market: res.market / 10000,
      custom: res.custom / 10000,
    };
  }, [fees, formValues.creatorFeeEnable]);

  useEffect(() => {
    if (!isEdit || !nftDetail?.listing_order || !fees || !listingToken) {
      return;
    }
    const creatorFeeReceiptList = fees.custom_royalties.map(
      (item) => item.recipient
    );

    const consideration =
      nftDetail.listing_order.protocol_data.parameters.consideration || [];
    const offer = nftDetail.listing_order.protocol_data.parameters.offer || [];
    const creatorFeeEnable = !creatorFeeReceiptList?.length
      ? false
      : !!consideration.find((item) => {
          return creatorFeeReceiptList.find((recipient) =>
            isSameAddress(item.recipient, recipient)
          );
        });
    const amount =
      offer.find((i) => {
        isSameAddress(i.token, nftDetail.contract_id);
      })?.endAmount || '1';
    const totalPrice = consideration.reduce((total, item) => {
      return total.plus(item.endAmount);
    }, new BigNumber(0));

    // check this
    const duration =
      +(nftDetail?.listing_order?.protocol_data.parameters.endTime || 0) -
      Date.now() / 1000;

    setFormValues({
      listingPrice: totalPrice
        .div(new BigNumber(10).pow(listingToken.decimals))
        .toString(),
      amount: +amount || null,
      creatorFeeEnable,
      duration: findClosestOption(duration * 1000).value,
    });
  }, [fees, nftDetail?.listing_order, listingToken, isEdit]);

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
    const listingPrice = +(formValues.listingPrice || 0);
    if (!floorPrice || !listingPrice) {
      return null;
    }
    return (listingPrice - floorPrice) / floorPrice;
  }, [
    nftDetail?.collection?.opensea_floor_price?.price,
    formValues.listingPrice,
  ]);

  const chain = findChain({
    serverId: nftDetail?.chain,
  });

  const { data: isApproved, runAsync: runCheckIsApproved } = useRequest(
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

  const { currentIndex, isSigning, run } = useMixedSigner({
    account: currentAccount!,
  });

  console.log({ isSigning });

  const buildTxs = useMemoizedFn(async () => {
    if (
      !nftDetail ||
      !fees ||
      !chain ||
      !currentAccount ||
      !listingToken ||
      !formValues.amount ||
      !formValues.listingPrice ||
      !formValues.duration
    ) {
      return;
    }
    const tx = isApproved
      ? null
      : await wallet.buildSetApprovedForAllTx({
          from: currentAccount?.address,
          chainId: chain.id,
          operator: OPENSEA_CONDUIT_ADDRESS,
          contractAddress: nftDetail.contract_id,
        });

    const endTime = ((Date.now() + formValues.duration) / 1000).toFixed();
    console.log(endTime);
    const res = await wallet.openapi.prepareListingNFT({
      chain_id: nftDetail.chain,
      inner_id: nftDetail.inner_id,
      wei_price: new BigNumber(formValues.listingPrice)
        .times(new BigNumber(10).exponentiatedBy(listingToken?.decimals))
        .toString(),
      quantity: formValues.amount,
      maker: currentAccount!.address,
      collection_id: last(nftDetail.collection_id?.split(':')) || '',
      salt: generateRandomSalt(),
      marketplace_fees: fees.marketplace_fees,
      custom_royalties: formValues.creatorFeeEnable
        ? fees.custom_royalties
        : [],
      expiration_time_at: +endTime,
      currency:
        nftTradingConfig?.[nftDetail.chain].listing_currency.token_id || '',
    });

    const sign = res.data.sign;

    const typedData = {
      domain: sign.domain,
      message: sign.value,
      primaryType: sign.primaryType,
      types: sign.types,
    };

    const result: Parameters<typeof run>[0] = [];
    if (tx) {
      result.push({
        kind: 'tx',
        txs: [tx as Tx],
      });
    }
    result.push({
      kind: 'typed',
      txs: [
        {
          data: typedData,
          from: currentAccount.address,
          version: 'V4',
        },
      ],
    });

    return {
      steps: result,
      res,
    };
  });

  const { runAsync: handleListing, loading: isSubmitting } = useRequest(
    async () => {
      if (
        !nftDetail ||
        !fees ||
        !chain ||
        !currentAccount ||
        !listingToken ||
        !formValues.amount ||
        !formValues.listingPrice ||
        !formValues.duration
      ) {
        return;
      }
      const txsInfo = await buildTxs();
      if (!txsInfo?.steps) {
        throw new Error('buildTx failed');
      }

      const steps = txsInfo.steps;

      const runFallback = async () => {
        const result: string[] = [];
        for (const step of steps) {
          if (step.kind === 'tx') {
            for (const tx of step.txs) {
              const hash = await wallet.sendRequest<string>({
                method: 'eth_sendTransaction',
                params: [tx],
              });
              result.push(hash);
            }
          }
          if (step.kind === 'typed') {
            for (const tx of step.txs) {
              const sig = await wallet.sendRequest<string>({
                method: 'eth_signTypedData_v4',
                params: [currentAccount.address, JSON.stringify(tx.data)],
              });
              result.push(sig);
            }
          }
        }
        return result;
      };

      let hashes: string[] = [];

      console.log({ steps });

      if (supportedDirectSign(currentAccount.type)) {
        try {
          hashes = await run(steps, {
            hiddenHardWareProcess: true,
            // getContainer: getContainer,
          });
          console.log('hashes', hashes);
        } catch (error) {
          console.error('-------', error);
          if (error === MINI_SIGN_ERROR.USER_CANCELLED) {
            //
            throw new Error(MINI_SIGN_ERROR.USER_CANCELLED);
          } else {
            hashes = await runFallback();
          }
        }
      } else {
        hashes = await runFallback();
      }

      if (!hashes.length) {
        throw new Error('sign failed');
      }
      if (hashes.length > 1) {
        const hash = hashes[0];
        const txCompleted = await new Promise((resolve) => {
          const handler = (res) => {
            if (res?.hash === hash) {
              eventBus.removeEventListener(EVENTS.TX_COMPLETED, handler);
              resolve(res || {});
            }
          };
          runCheckIsApproved().then((v) => {
            if (v) {
              resolve({});
            }
          });
          eventBus.addEventListener(EVENTS.TX_COMPLETED, handler);
        });
      }
      const signature = last(hashes);
      if (!signature) {
        throw new Error('Sign Failed');
      }
      const listingRes = await wallet.openapi.createListingNFT({
        order: txsInfo.res.data.post.body.order,
        signature,
        chain_id: nftDetail.chain,
      });
    },
    {
      manual: true,
      onError(e) {
        console.error(e);
        onFailed?.();
      },
      onSuccess() {
        onSuccess?.();
      },
    }
  );

  const { runAsync: handleListingBack } = useRequest(
    async () => {
      if (
        !nftDetail ||
        !fees ||
        !chain ||
        !currentAccount ||
        !listingToken ||
        !formValues.amount ||
        !formValues.listingPrice ||
        !formValues.duration
      ) {
        return;
      }
      const isApproved = await wallet.checkIsApprovedForAll({
        chainId: chain.id,
        owner: currentAccount!.address,
        operator: OPENSEA_CONDUIT_ADDRESS,
        contractAddress: nftDetail.contract_id,
      });
      const tx = await wallet.buildSetApprovedForAllTx({
        from: currentAccount?.address,
        chainId: chain.id,
        operator: OPENSEA_CONDUIT_ADDRESS,
        contractAddress: nftDetail.contract_id,
      });

      if (!isApproved) {
        await wallet.sendRequest({
          method: 'eth_sendTransaction',
          params: [tx],
        });
      }

      const endTime = ((Date.now() + formValues.duration) / 1000).toFixed();
      console.log(endTime);
      const res = await wallet.openapi.prepareListingNFT({
        chain_id: nftDetail.chain,
        inner_id: nftDetail.inner_id,
        wei_price: new BigNumber(formValues.listingPrice)
          .times(new BigNumber(10).exponentiatedBy(listingToken?.decimals))
          .toString(),
        quantity: formValues.amount,
        maker: currentAccount!.address,
        collection_id: last(nftDetail.collection_id?.split(':')) || '',
        salt: generateRandomSalt(),
        marketplace_fees: fees.marketplace_fees,
        custom_royalties: formValues.creatorFeeEnable
          ? fees.custom_royalties
          : [],
        expiration_time_at: +endTime,
        currency:
          nftTradingConfig?.[nftDetail.chain].listing_currency.token_id || '',
      });

      const sign = res.data.sign;
      const signature: string = await wallet.sendRequest({
        method: 'eth_signTypedData_v4',
        params: [
          currentAccount?.address,
          JSON.stringify({
            domain: sign.domain,
            message: sign.value,
            primaryType: sign.primaryType,
            types: sign.types,
          }),
        ],
      });

      // todo wait approved
      // const txCompleted = await new Promise<{ gasUsed: number }>((resolve) => {
      //   const handler = (res) => {
      //     if (res?.hash === hash) {
      //       eventBus.removeEventListener(EVENTS.TX_COMPLETED, handler);
      //       resolve(res || {});
      //     }
      //   };
      //   eventBus.addEventListener(EVENTS.TX_COMPLETED, handler);
      // });

      const listingRes = await wallet.openapi.createListingNFT({
        order: res.data.post.body.order,
        signature,
        chain_id: nftDetail.chain,
      });
    },
    {
      manual: true,
      onError() {
        onFailed?.();
      },
      onSuccess() {
        onSuccess?.();
      },
    }
  );

  return (
    <Container>
      <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
        {isEdit ? 'Edit Listing' : 'Create listing'}
      </h1>
      <div className="px-[20px] pb-[24px]">
        <div className="py-[12px] border-b-[0.5px] border-solid border-rabby-neutral-line">
          <table className="w-full">
            <colgroup>
              <col width={260} />
              <col width={100} />
              <col width={100} />
              <col width={100} />
              <col width={100} />
              <col width={180} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot">
                  NFT
                </th>
                <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                  Floor
                </th>
                <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                  Top Offer
                </th>
                <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                  Cost
                </th>
                <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                  Proceeds
                </th>
                <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                  Listed as
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="flex items-center gap-[10px]">
                    <NFTAvatar
                      className="w-[36px] h-[36px]"
                      chain={nftDetail?.chain}
                      content={nftDetail?.content}
                      type={nftDetail?.content_type}
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
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
                  </div>
                </td>
                <td>
                  <div
                    className={clsx(
                      'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                    )}
                  >
                    {formatTokenAmount(
                      nftDetail?.collection?.opensea_floor_price?.price || 0
                    )}{' '}
                    {nftDetail?.collection?.opensea_floor_price?.token?.symbol}
                  </div>
                  <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate text-right">
                    {formatUsdValue(
                      new BigNumber(
                        nftDetail?.collection?.opensea_floor_price?.price || 0
                      )
                        .times(
                          nftDetail?.collection?.opensea_floor_price?.token
                            ?.price || 0
                        )
                        .toString()
                    )}
                  </div>
                </td>
                <td>
                  {nftDetail?.best_offer_order ? (
                    <>
                      <div
                        className={clsx(
                          'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                        )}
                      >
                        {bestOfferPrice
                          ? formatTokenAmount(bestOfferPrice.toString())
                          : '-'}{' '}
                        {nftDetail?.best_offer_order?.price?.currency || '-'}
                      </div>
                      <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate text-right">
                        {bestOfferUsdPrice
                          ? formatUsdValue(bestOfferUsdPrice.toString())
                          : '-'}
                      </div>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <div
                    className={clsx(
                      'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                    )}
                  >
                    -
                  </div>
                </td>
                <td>
                  {formValues.listingPrice ? (
                    <>
                      <div
                        className={clsx(
                          'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                        )}
                      >
                        {formatTokenAmount(
                          new BigNumber(formValues.listingPrice)
                            .times(1 - feesRate.total)
                            .times(formValues?.amount || 0)
                            .toString()
                        )}{' '}
                        {listingToken?.symbol}
                      </div>
                      <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate text-right">
                        {formatUsdValue(
                          new BigNumber(formValues.listingPrice)
                            .times(1 - feesRate.total)
                            .times(formValues?.amount || 0)
                            .times(listingToken?.price || 0)
                            .toString()
                        )}
                      </div>
                    </>
                  ) : (
                    <div
                      className={clsx(
                        'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                      )}
                    >
                      -
                    </div>
                  )}
                </td>
                <td>
                  <Input
                    className="custom-input"
                    value={formValues.listingPrice}
                    onChange={(e) => {
                      setFormValues({ listingPrice: e.target.value });
                    }}
                    min={0}
                    step={1e-14}
                    type="number"
                    placeholder="0"
                    suffix={listingToken?.symbol}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {nftDetail?.amount && nftDetail?.amount > 1 ? (
          <div className="py-[16px] space-y-[24px] border-b-[0.5px] border-solid border-rabby-neutral-line">
            <div className="flex items-center justify-between">
              <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
                Quantity
              </div>
              <div>
                <StepInput
                  min={1}
                  max={nftDetail?.amount || 1}
                  value={formValues.amount}
                  onChange={(v) => {
                    setFormValues({
                      amount: v,
                    });
                  }}
                  maxTooltip={
                    (formValues.amount || 0) >= (nftDetail?.amount || 1)
                      ? `Your balance is ${nftDetail?.amount || 1}`
                      : undefined
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
                Total listing price
              </div>
              <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate">
                {formValues?.listingPrice && formValues.amount ? (
                  <>
                    {formatTokenAmount(
                      new BigNumber(formValues.listingPrice)
                        .times(formValues.amount)
                        .toString()
                    )}{' '}
                    {listingToken?.symbol}{' '}
                    <span className="text-r-neutral-foot font-normal">
                      (
                      {formatUsdValue(
                        new BigNumber(formValues.listingPrice)
                          .times(formValues.amount)
                          .times(listingToken?.price || 0)
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
          </div>
        ) : null}
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
                feesRate.market *
                  +(formValues.listingPrice || 0) *
                  (formValues.amount || 0)
              )}{' '}
              {listingToken?.symbol}{' '}
              <span className="text-r-neutral-foot font-normal">
                (
                {formatUsdValue(
                  feesRate.market *
                    +(formValues.listingPrice || 0) *
                    (formValues.amount || 0) *
                    (listingToken?.price || 0)
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
                  title="Creator earnings will be paid by the seller."
                  overlayClassName="rectangle"
                >
                  <RcIconInfoCC className="ml-[2px] mr-[4px]" />
                </Tooltip>
                <Switch
                  checked={formValues.creatorFeeEnable}
                  onChange={(v) => {
                    setFormValues({
                      creatorFeeEnable: v,
                    });
                  }}
                ></Switch>
              </div>
              <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate">
                {formValues?.creatorFeeEnable && feesRate.custom ? (
                  <>
                    {formatTokenAmount(
                      feesRate.custom *
                        +(formValues.listingPrice || 0) *
                        (formValues.amount || 0)
                    )}{' '}
                    {listingToken?.symbol}{' '}
                    <span className="text-r-neutral-foot font-normal">
                      (
                      {formatUsdValue(
                        feesRate.custom *
                          +(formValues.listingPrice || 0) *
                          (formValues.amount || 0) *
                          (listingToken?.price || 0)
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
                new BigNumber(formValues.listingPrice || 0)
                  .times(1 - feesRate.total)
                  .times(formValues?.amount || 0)
                  .toString()
              )}{' '}
              {listingToken?.symbol}{' '}
              <span className="text-r-neutral-foot font-normal">
                (
                {formatUsdValue(
                  new BigNumber(formValues.listingPrice || 0)
                    .times(1 - feesRate.total)
                    .times(formValues?.amount || 0)
                    .times(listingToken?.price || 0)
                    .toString()
                )}
                )
              </span>
            </div>
          </div>
        </div>
        <footer>
          <div className="flex items-center justify-between">
            <Select
              value={formValues.duration}
              onChange={(v) => {
                setFormValues({
                  duration: v,
                });
              }}
              className="custom-select"
              options={options}
            ></Select>
            {currentAccount ? (
              <SignProcessButton
                type="primary"
                size="large"
                className="ml-[16px]"
                onClick={handleListing}
                account={currentAccount}
                isSigning={isSubmitting && isSigning}
                loading={isSubmitting}
                disabled={
                  !formValues.amount ||
                  !formValues.listingPrice ||
                  !formValues.duration
                }
              >
                {isApproved ? 'Complete listing' : 'Approve and Listing'}
              </SignProcessButton>
            ) : null}
          </div>
        </footer>
      </div>
    </Container>
  );
};
export const CreateListingModal: React.FC<Props> = (props) => {
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
      closeIcon={<RcIconCloseCC className="w-[20px] h-[20px]" />}
      destroyOnClose
    >
      <Content {...props} />
    </Modal>
  );
};
