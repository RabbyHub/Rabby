import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { NFTDetail, Tx } from '@rabby-wallet/rabby-api/dist/types';
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
import { useMemoizedFn } from 'ahooks';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { findChain } from '@/utils/chain';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';

export const CancelListingModal: React.FC<
  ModalProps & {
    nftDetail?: NFTDetail;
    onSuccess?(): void;
  }
> = (props) => {
  const { nftDetail, onSuccess, ...rest } = props;

  const currentAccount = useCurrentAccount();
  const nftTradingConfig = useNFTTradingConfig();

  const listingOffer = useMemo(() => {
    if (
      nftDetail?.listing_order?.maker?.address &&
      currentAccount?.address &&
      isSameAddress(
        nftDetail?.listing_order?.maker?.address,
        currentAccount?.address
      )
    ) {
      return nftDetail?.listing_order;
    }
  }, [nftDetail]);

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
  const canDirectSign = useMemo(
    () => supportedDirectSign(currentAccount?.type || ''),
    [currentAccount?.type]
  );

  const chain = findChain({
    serverId: nftDetail?.chain,
  });

  const handleSubmit = useMemoizedFn(async () => {
    if (
      !currentAccount?.address ||
      !chain?.id ||
      !nftDetail?.listing_order?.protocol_data?.parameters
    ) {
      return;
    }
    const tx = (await wallet.buildCancelNFTListTx({
      address: currentAccount?.address,
      chainId: chain?.id,
      order: nftDetail?.listing_order?.protocol_data?.parameters,
    })) as Tx;
    const txs = [tx];

    const runFallback = async () => {
      for (const tx of txs) {
        await wallet.sendRequest<string>({
          method: 'eth_sendTransaction',
          params: [tx],
        });
      }
    };

    if (canDirectSign && currentAccount) {
      resetGasStore();
      closeSign();
      const signerConfig = {
        txs,

        showSimulateChange: true,
        disableSignBtn: false,
        onRedirectToDeposit: () => {},
        ga: {},
      } as const;
      try {
        await openUI(signerConfig);
        onSuccess?.();
        return;
      } catch (error) {
        console.log('openUI error', error);
        if (error !== MINI_SIGN_ERROR.USER_CANCELLED) {
          console.error('Dapp action direct sign error', error);
          await runFallback()
            .then(() => {
              onSuccess?.();
            })
            .catch((fallbackError) => {
              console.error('Dapp action fallback error', fallbackError);
              const fallbackMsg =
                typeof (fallbackError as any)?.message === 'string'
                  ? (fallbackError as any).message
                  : 'Transaction failed';
              message.error(fallbackMsg);
            });
        }
        return;
      }
    }

    try {
      await runFallback();
    } catch (error) {
      console.error('Transaction failed:', error);
      message.error(
        typeof error?.message === 'string'
          ? error?.message
          : 'Transaction failed'
      );
    }
  });

  return (
    <Modal
      {...rest}
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
      closeIcon={<RcIconCloseCC className="w-[20px] h-[20px]" />}
    >
      <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
        Cancel Listing
      </h1>
      <div className="px-[20px] pb-[24px] pt-[12px]">
        <div className="flex items-center justify-between">
          <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
            {listingOffer?.remaining_quantity} Listing
          </div>
          <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
            Listing Price
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
            <div className="space-y-[4px]">
              {listingOffer && listingToken ? (
                <>
                  <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1 text-right">
                    {formatTokenAmount(
                      new BigNumber(listingOffer.current_price)
                        .div(
                          new BigNumber(10).exponentiatedBy(
                            listingToken?.decimals
                          )
                        )
                        .toString()
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
                        .times(listingToken.price)
                        .toString()
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
          <Button type="primary" block size="large" onClick={handleSubmit}>
            Cancel listing
          </Button>
        </footer>
      </div>
    </Modal>
  );
};
