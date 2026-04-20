import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import {
  NFTDetail,
  NFTListingOrder,
  Tx,
} from '@rabby-wallet/rabby-api/dist/types';
import { Button, message, Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useNFTTradingConfig } from '../hooks/useNFTTradingConfig';
import {
  formatTokenAmount,
  formatUsdValue,
  isSameAddress,
  useWallet,
} from '@/ui/utils';
import { useTokenInfo } from '@/ui/hooks/useTokenInfo';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { findChain } from '@/utils/chain';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { IconOpenSea } from '@/ui/assets';
import { last } from 'lodash';
import { waitForTxCompleted } from '@/ui/utils/transaction';
import { useTranslation } from 'react-i18next';

type Props = ModalProps & {
  nftDetail?: NFTDetail;
  listingOrders?: NFTListingOrder[];
  onSigned?(p: Promise<any>): void;
};

const Content: React.FC<Props> = (props) => {
  const { nftDetail, onSigned, listingOrders, ...rest } = props;

  const currentAccount = useCurrentAccount();
  const nftTradingConfig = useNFTTradingConfig();

  const listingOffer = useMemo(() => {
    return listingOrders?.[0];
  }, [listingOrders]);

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

  const {
    openUI,
    resetGasStore,
    close: closeSign,
    updateConfig,
  } = useMiniSigner({
    account: currentAccount!,
  });

  const wallet = useWallet();
  // const canDirectSign = useMemo(
  //   () => supportedDirectSign(currentAccount?.type || ''),
  //   [currentAccount?.type]
  // );

  const canDirectSign = false;

  const chain = findChain({
    serverId: nftDetail?.chain,
  });

  const { runAsync: handleSubmit, loading: isSubmitting } = useRequest(
    async () => {
      if (!currentAccount?.address || !chain?.id || !listingOrders?.length) {
        throw new Error('failed');
      }
      const tx = (await wallet.buildCancelNFTListTx({
        address: currentAccount?.address,
        chainId: chain?.id,
        // orders: nftDetail?.listing_order?.protocol_data?.parameters,
        orders: nftDetail?.collection?.is_erc721
          ? listingOrders.map((item) => item.protocol_data.parameters)
          : listingOrders
              .slice(0, 1)
              .map((item) => item.protocol_data.parameters),
      })) as Tx;
      const txs = [tx];

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
                  src={chain.logo}
                  alt=""
                  className="absolute top-[-2px] right-[-2px] w-[12px] h-[12px] rounded-full"
                />
              </div>
              <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title1">
                Cancel Listing NFT
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
            console.error('direct sign error', error);
            await runFallback();
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
  const { t } = useTranslation();

  return (
    <>
      <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
        {t('page.desktopProfile.nft.cancelModal.title')}
      </h1>
      <div className="px-[20px] pb-[24px] pt-[12px]">
        <div className="flex items-center justify-between">
          <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
            {t('page.desktopProfile.nft.cancelModal.listing')}
          </div>
          <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
            {t('page.desktopProfile.nft.cancelModal.listingPrice')}
          </div>
        </div>
        <div className="flex items-center gap-[10px] pt-[12px] pb-[24px]">
          <NFTAvatar
            className="w-[36px] h-[36px]"
            chain={nftDetail?.chain}
            content={nftDetail?.content}
            type={nftDetail?.content_type}
          />
          <div className="flex-1 min-w-0 flex justify-between gap-[4px]">
            <div className="space-y-[4px]">
              <div className="flex items-center gap-[6px]">
                <div
                  className={clsx(
                    'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate'
                  )}
                >
                  {nftDetail?.name || '-'}
                </div>
                {+(
                  listingOffer?.protocol_data?.parameters?.offer?.[0]
                    ?.startAmount || 0
                ) > 1 ? (
                  <div
                    className={clsx(
                      'text-[11px] leading-[13px] font-medium text-r-neutral-foot',
                      'px-[6px] py-[2px] border-[0.5px] border-rabby-neutral-line rounded-[4px] shrink-0'
                    )}
                  >
                    x
                    {listingOffer?.protocol_data?.parameters?.offer?.[0]
                      ?.startAmount || 1}
                  </div>
                ) : null}
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
              {listingOffer && listingToken ? (
                <>
                  <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
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
                        .toFixed()
                    )}{' '}
                    {listingToken?.symbol}
                  </div>
                  <div
                    className={clsx(
                      'text-[13px] leading-[16px] font-medium text-r-neutral-foot'
                    )}
                  >
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
                        .toFixed()
                    )}
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
        <footer>
          <Button
            type="primary"
            block
            size="large"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            {t('page.desktopProfile.nft.cancelModal.cancelListing')}
          </Button>
        </footer>
      </div>
    </>
  );
};
export const CancelListingModal: React.FC<Props> = (props) => {
  return (
    <Modal
      {...props}
      width={440}
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
