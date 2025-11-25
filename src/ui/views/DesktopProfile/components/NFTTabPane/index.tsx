import { RcIconNftEmpty } from '@/ui/assets/desktop/common';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import {
  CollectionList,
  NFTDetail,
  NFTItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { message, Skeleton, Switch } from 'antd';
import clsx from 'clsx';
import { omit, range } from 'lodash';
import React from 'react';
import { useSetState } from 'react-use';
import { AcceptOfferModal } from './components/AcceptOfferModal';
import { CancelListingModal } from './components/CancelListingModal';
import { CreateListingModal } from './components/CreateListingModal';
import { NFTCardItem } from './components/NFTCardItem';
import { NFTDetailModal } from './components/NFTDetailModal';
import { ResultModal } from './components/ResultModal';
import { useHistory } from 'react-router-dom';
import { useListenTxReload } from '../../hooks/useListenTxReload';

export const NFTTabPane: React.FC<{ selectChainId?: string }> = ({
  selectChainId,
}) => {
  const wallet = useWallet();
  const [isAll, setIsAll] = React.useState(false);

  const history = useHistory();

  const [state, setState] = useSetState<{
    current: {
      nft: NFTItem;
      collection?: Omit<CollectionList, 'nft_list'>;
    } | null;
    nftDetail?: NFTDetail;
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
    };
  }>({
    current: null,
  });

  const currentAccount = useCurrentAccount();

  const { data: list, loading, runAsync } = useRequest(
    async () => {
      if (!currentAccount?.address) {
        return [];
      }
      const collections = await wallet.openapi.collectionList({
        id: currentAccount?.address,
        isAll: isAll,
        chainId: selectChainId,
      });

      const result: {
        nft: NFTItem;
        collection: Omit<CollectionList, 'nft_list'>;
      }[] = [];

      for (const collection of collections) {
        if (!isAll && collection.is_hidden) {
          continue;
        }
        collection.nft_list.forEach((nft) => {
          result.push({ nft, collection: omit(collection, 'nft_list') });
        });
      }

      return result;
    },
    {
      refreshDeps: [isAll, currentAccount?.address, selectChainId],
    }
  );

  useListenTxReload(() => {
    runAsync();
  });

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
                'py-[6px] px-[12px] rounded-[8px] bg-rb-neutral-foot',
                'text-rb-neutral-InvertHighlight text-[12px] leading-[14px] font-medium'
              )}
            >
              All ({list?.length || 0})
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
              Hide Low-Value NFTs
            </div>
          </label>
        </header>
      )}
      {loading}
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
              <ThemeIcon src={RcIconNftEmpty}></ThemeIcon>
              <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
                No NFTs
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
        onCreateListing={(nftDetail) => {
          setState({
            detailModalVisible: false,
            current: null,
            nftDetail,
            listingModalVisible: true,
            isEditListing: false,
          });
        }}
        onEditListing={(nftDetail) => {
          setState({
            detailModalVisible: false,
            current: null,
            nftDetail,
            listingModalVisible: true,
            isEditListing: true,
          });
        }}
        onAccept={(nftDetail) => {
          setState({
            detailModalVisible: false,
            current: null,
            nftDetail,
            acceptModalVisible: true,
          });
        }}
        onCancelListing={async (nftDetail) => {
          setState({
            detailModalVisible: false,
            current: null,
            cancelModalVisible: true,
            nftDetail,
          });
        }}
        nft={state.current?.nft}
        collection={state.current?.collection}
        onSend={() => {
          const query = new URLSearchParams();
          query.set('nftItem', JSON.stringify(state.current!.nft!));
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
                title: 'Just Canceled!',
                desc: `You've canceled listing ${state.nftDetail?.name} on OpenSea`,
              },
              errorMessage: {
                title: 'Failed!',
                desc: 'Please try again',
              },
              pendingPromise: promise,
            },
          });
        }}
      />
      <CreateListingModal
        visible={state.listingModalVisible}
        nftDetail={state.nftDetail}
        isEdit={state.isEditListing}
        onCancel={() => {
          setState({
            nftDetail: undefined,
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
                title: 'Just listed!',
                desc: `You've listed ${state.nftDetail?.name} on OpenSea`,
              },
              errorMessage: {
                title: 'Listing Failed',
                desc: 'Please try again.',
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
                title: 'Sold Successfully',
                desc: `You’ve successfully sold ${state.nftDetail?.name}`,
              },
              errorMessage: {
                title: 'Sale Failed',
                desc: 'Please try again',
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
