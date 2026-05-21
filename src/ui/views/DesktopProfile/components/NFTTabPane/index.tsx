import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useNFTCollections } from '@/ui/hooks/useNFTCollections';
import {
  CollectionList,
  NFTDetail,
  NFTItem,
  NFTListingOrder,
} from '@rabby-wallet/rabby-api/dist/types';
import { Skeleton, Switch } from 'antd';
import clsx from 'clsx';
import { omit, range } from 'lodash';
import React, { useEffect } from 'react';
import { useSetState } from 'react-use';
import { AcceptOfferModal } from './components/AcceptOfferModal';
import { CancelListingModal } from './components/CancelListingModal';
import { CreateListingModal } from './components/CreateListingModal';
import { NFTCardItem } from './components/NFTCardItem';
import { NFTDetailModal } from './components/NFTDetailModal';
import { ResultModal } from './components/ResultModal';
import { useHistory } from 'react-router-dom';
import { useListenTxReload } from '../../hooks/useListenTxReload';
import { useTranslation } from 'react-i18next';
import { EmptyIcon } from '../TokensTabPane/TokenListEmpty';

export const NFTTabPane: React.FC<{ selectChainId?: string }> = ({
  selectChainId,
}) => {
  const { t } = useTranslation();
  const [isAll, setIsAll] = React.useState(false);

  const history = useHistory();

  const [state, setState] = useSetState<{
    current: {
      nft: NFTItem;
      collection?: Omit<CollectionList, 'nft_list'>;
    } | null;
    nftDetail?: NFTDetail;
    listingOrders?: NFTListingOrder[];
    detailModalVisible?: boolean;
    listingModalVisible?: boolean;
    cancelModalVisible?: boolean;
    acceptModalVisible?: boolean;
    resultModalVisible?: boolean;
    isEditListing?: boolean;
    resultState?: {
      status?: 'success' | 'failed' | 'pending';
      pendingPromise?: Promise<any>;
      successMessage?: {
        title?: string;
        desc?: string;
      };
      errorMessage?: {
        title?: string;
        desc?: string;
      };
    } | null;
  }>({
    current: null,
  });

  const currentAccount = useCurrentAccount();
  const { collections, isLoading: loading, refresh } = useNFTCollections(
    currentAccount?.address
  );

  const list = React.useMemo(() => {
    const result: {
      nft: NFTItem;
      collection: Omit<CollectionList, 'nft_list'>;
    }[] = [];

    collections.forEach((collection) => {
      if (selectChainId && collection.chain !== selectChainId) {
        return;
      }
      if (!isAll && (collection.is_hidden || !collection.is_core)) {
        return;
      }

      const baseCollection = omit(collection, 'nft_list');
      collection.nft_list.forEach((nft) => {
        result.push({
          nft,
          collection: baseCollection,
        });
      });
    });

    return result.sort(
      (a, b) =>
        (b?.collection?.credit_score || 0) - (a?.collection?.credit_score || 0)
    );
  }, [collections, isAll, selectChainId]);

  useListenTxReload(() => {
    refresh();
  });

  useEffect(() => {
    setState({
      current: null,
      nftDetail: undefined,
      listingOrders: undefined,
      detailModalVisible: false,
      listingModalVisible: false,
      cancelModalVisible: false,
      acceptModalVisible: false,
      resultModalVisible: false,
      isEditListing: false,
      resultState: null,
    });
  }, [currentAccount?.address]);

  return (
    <div className="py-[16px] px-[20px]">
      {loading ? (
        <div className="flex items-center justify-between mb-[16px]">
          <Skeleton.Input className="w-[100px] h-[30px] rounded-[4px]" active />
          <Skeleton.Input className="w-[198px] h-[30px] rounded-[4px]" active />
        </div>
      ) : (
        <header className="flex items-center justify-between mb-[16px]">
          <div className={clsx('rounded-[10px] p-[2px] bg-rb-neutral-bg-0')}>
            <div
              className={clsx(
                'py-[6px] px-[12px] rounded-[8px] bg-rb-neutral-foot dark:bg-rb-neutral-bg-4',
                'text-rb-neutral-InvertHighlight text-[12px] leading-[14px] font-medium'
              )}
            >
              {t('page.desktopProfile.nft.all')} ({list?.length || 0})
            </div>
          </div>
          <label className="flex items-center gap-[6px] cursor-pointer">
            <Switch
              checked={!isAll}
              onChange={(v) => {
                setIsAll(!v);
              }}
            />
            <div className="text-rb-neutral-title-1 text-[14px] leading-[17px]">
              {t('page.desktopProfile.nft.hideLowValue')}
            </div>
          </label>
        </header>
      )}
      <main>
        <div className="flex items-center flex-wrap gap-[12px]">
          {loading ? (
            <>
              {range(10).map((i) => (
                <div key={i} className={clsx('w-[204px]')}>
                  <Skeleton.Input
                    className="w-[198px] h-[198px] rounded-[4px]"
                    active
                  />
                  <Skeleton.Input
                    className="w-[198px] h-[24px] rounded-[4px]"
                    active
                  />
                </div>
              ))}
            </>
          ) : list?.length ? (
            <>
              {list?.map((item) => {
                return (
                  <NFTCardItem
                    key={`${item.nft.id}-${item.nft.chain}-${item.collection.id}`}
                    item={item}
                    onClick={() => {
                      setState({
                        current: item,
                        detailModalVisible: true,
                      });
                    }}
                  />
                );
              })}
            </>
          ) : (
            <div className="w-full py-[160px] flex flex-col items-center justify-center gap-[8px]">
              <EmptyIcon />
              <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
                {t('page.desktopProfile.nft.empty')}
              </div>
            </div>
          )}
        </div>
      </main>
      <NFTDetailModal
        visible={state.detailModalVisible}
        onCancel={() => {
          setState({
            detailModalVisible: false,
            current: null,
          });
        }}
        onCreateListing={({ nftDetail, listingOrders }) => {
          setState({
            detailModalVisible: false,
            current: null,
            nftDetail,
            listingModalVisible: true,
            isEditListing: false,
            listingOrders,
          });
        }}
        onEditListing={({ nftDetail, listingOrders }) => {
          setState({
            detailModalVisible: false,
            current: null,
            nftDetail,
            listingModalVisible: true,
            isEditListing: true,
            listingOrders,
          });
        }}
        onAccept={({ nftDetail, listingOrders }) => {
          setState({
            detailModalVisible: false,
            current: null,
            nftDetail,
            acceptModalVisible: true,
            listingOrders,
          });
        }}
        onCancelListing={async ({ nftDetail, listingOrders }) => {
          setState({
            detailModalVisible: false,
            current: null,
            cancelModalVisible: true,
            nftDetail,
            listingOrders,
          });
        }}
        nft={state.current?.nft}
        collection={state.current?.collection}
        onSend={() => {
          const query = new URLSearchParams();
          query.set(
            'nftItem',
            encodeURIComponent(JSON.stringify(state.current!.nft))
          );
          query.set('action', 'send');
          query.set('sendPageType', 'sendNft');
          history.replace(`${history.location.pathname}?${query.toString()}`);
          setState({
            detailModalVisible: false,
            current: null,
            nftDetail: undefined,
          });
        }}
      />
      <CancelListingModal
        visible={state.cancelModalVisible}
        nftDetail={state.nftDetail}
        listingOrders={state.listingOrders}
        onCancel={() => {
          setState({
            nftDetail: undefined,
            cancelModalVisible: false,
          });
        }}
        onSigned={(promise) => {
          setState({
            cancelModalVisible: false,
            resultModalVisible: true,
            resultState: {
              status: 'pending',
              successMessage: {
                title: t('page.desktopProfile.nft.message.cancelSuccess'),
                desc: t('page.desktopProfile.nft.message.cancelSuccessDesc', {
                  name: state.nftDetail?.name,
                }),
              },
              errorMessage: {
                title: t('page.desktopProfile.nft.message.cancelFailed'),
                desc: t('page.desktopProfile.nft.message.cancelFailedDesc'),
              },
              pendingPromise: promise,
            },
          });
        }}
      />
      <CreateListingModal
        visible={state.listingModalVisible}
        nftDetail={state.nftDetail}
        listingOrders={state.listingOrders}
        isEdit={state.isEditListing}
        onCancel={() => {
          setState({
            nftDetail: undefined,
            listingOrders: undefined,
            listingModalVisible: false,
            isEditListing: false,
          });
        }}
        onSigned={(promise) => {
          setState({
            listingModalVisible: false,
            resultModalVisible: true,
            resultState: {
              status: 'pending',
              successMessage: {
                title: t('page.desktopProfile.nft.message.listingSuccess'),
                desc: t('page.desktopProfile.nft.message.listingSuccessDesc', {
                  name: state.nftDetail?.name,
                }),
              },
              errorMessage: {
                title: t('page.desktopProfile.nft.message.listingFailed'),
                desc: t('page.desktopProfile.nft.message.listingFailedDesc'),
              },
              pendingPromise: promise,
            },
          });
        }}
        // onSuccess={() => {}}
        // onFailed={() => {
        //   setState({
        //     resultModalVisible: true,
        //     resultState: {
        //       status: 'failed',
        //       errorMessage: {
        //         title: 'Listing Failed',
        //         desc: 'Please try again.',
        //       },
        //     },
        //   });
        // }}
      />
      <AcceptOfferModal
        visible={state.acceptModalVisible}
        nftDetail={state.nftDetail}
        onCancel={() => {
          setState({
            nftDetail: undefined,
            acceptModalVisible: false,
          });
        }}
        onSigned={(p) => {
          setState({
            acceptModalVisible: false,
            resultModalVisible: true,
            resultState: {
              successMessage: {
                title: t('page.desktopProfile.nft.message.acceptSuccess'),
                desc: t('page.desktopProfile.nft.message.acceptSuccessDesc', {
                  name: state.nftDetail?.name,
                }),
              },
              errorMessage: {
                title: t('page.desktopProfile.nft.message.acceptFailed'),
                desc: t('page.desktopProfile.nft.message.acceptFailedDesc'),
              },
              status: 'pending',
              pendingPromise: p,
            },
          });
        }}
      />
      <ResultModal
        nftDetail={state.nftDetail}
        visible={state.resultModalVisible}
        onCancel={() => {
          setState({
            resultModalVisible: false,
            resultState: undefined,
          });
        }}
        {...state.resultState}
      />
    </div>
  );
};
