import { NFTApproval, TokenItem } from '@/background/service/openapi';
import { NameAndAddress, PageHeader, TokenWithChain } from '@/ui/component';
import { Button, Drawer } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NFTAvatar from '../../Dashboard/components/NFT/NFTAvatar';
import { ApprovalContractItem, ApprovalItem } from './ApprovalContractItem';
import IconUnknownNFT from 'ui/assets/unknown-nft.svg';
import { IconChecked, IconNotChecked } from '@/ui/assets';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';

export const RevokeApprovalDrawer = (props: {
  item?: ApprovalItem;
  visible: boolean;
  onClose: () => void;
  drawClassName?: string;
}) => {
  const { item, visible, onClose, drawClassName } = props;
  const { t } = useTranslation();
  const wallet = useWallet();

  const [selectedList, setSelectedList] = useState<number[]>([]);

  const handleRevoke = async () => {
    if (item?.list) {
      const revokeList = selectedList.map((e) => {
        const token = item.list[e];
        if ('inner_id' in token) {
          const abi = token?.is_erc721
            ? 'ERC721'
            : token?.is_erc1155
            ? 'ERC1155'
            : '';
          return {
            chainServerId: token?.chain,
            contractId: token?.contract_id,
            spender: token?.spender?.id,
            abi,
            tokenId: token?.inner_id,
            isApprovedForAll: false,
          } as const;
        } else if ('contract_name' in token) {
          const abi = token?.is_erc721
            ? 'ERC721'
            : token?.is_erc1155
            ? 'ERC1155'
            : '';
          return {
            chainServerId: token?.chain,
            contractId: token?.contract_id,
            spender: token?.spender?.id,
            tokenId: null,
            abi,
            isApprovedForAll: true,
          } as const;
        } else {
          return {
            chainServerId: token?.chain,
            id: token?.id,
            spender: item.id,
          };
        }
      });
      try {
        wallet.revoke({ list: revokeList });
        window.close();
      } catch (error) {
        console.error('popup revoke error:', error);
      }
    }
  };

  const handleSelectAll = () => {
    if (item?.list) {
      setSelectedList((e) =>
        e.length === item.list.length
          ? []
          : Array(item.list.length)
              .fill(0)
              .map((_, i) => i)
      );
    }
  };

  useEffect(() => {
    if (visible) {
      setSelectedList([]);
    }
  }, [visible]);

  if (!item) return null;

  return (
    <Drawer
      placement="right"
      width={'100%'}
      height={'100%'}
      visible={visible}
      onClose={onClose}
      className={drawClassName}
      bodyStyle={{
        padding: '0 20px',
        backgroundColor: '#f5f6fa',
        position: 'relative',
      }}
      push={false}
      closeIcon={null}
      destroyOnClose
    >
      <div>
        <PageHeader className="mb-0 px-0" onBack={onClose} forceShowBack>
          {t('Revoke approval')}
        </PageHeader>

        <div className="mt-16 mb-18">
          <ApprovalContractItem data={[item]} index={0} />
        </div>

        <section className="mb-[6px] flex justify-between items-center">
          <span className="text-12 text-gray-title">
            {t('Approved Token and NFT')}
          </span>
          <div
            className="w-[67px] h-[22px] text-12 cursor-pointer flex items-center justify-center bg-blue-light bg-opacity-[0.2] text-center text-blue-light"
            onClick={handleSelectAll}
          >
            {t('Select All')}
          </div>
        </section>

        <section className="max-h-[364px] overflow-hidden overflow-y-scroll rounded-[6px] pb-[40px]">
          {item.list.map((e, index) => {
            return (
              <div
                key={index}
                className={clsx(
                  'h-[51px] px-[16px] flex justify-between items-center bg-white  border-b  cursor-pointer',
                  index !== item.list.length - 1
                    ? 'border-gray-divider'
                    : 'border-transparent rounded-b-[6px]'
                )}
                onClick={(e) => {
                  if ((e.target as HTMLElement)?.id !== 'copyIcon') {
                    setSelectedList((l) =>
                      l.includes(index)
                        ? l.filter((e) => e !== index)
                        : [...l, index]
                    );
                  }
                }}
              >
                {'logo_url' in e ? (
                  <TokenWithChain
                    token={(e as unknown) as TokenItem}
                    hideConer
                    hideChainIcon
                  />
                ) : (
                  <NFTAvatar
                    className="w-[24px] h-[24px]"
                    type={(e as NFTApproval)?.content_type}
                    content={(e as NFTApproval)?.content}
                    thumbnail
                    unknown={IconUnknownNFT}
                  />
                )}
                {/* <div className=""> */}
                {'spender' in e ? (
                  <div className="flex flex-col ml-[8px]">
                    <div className="text-13 font-medium leading-[15px] mb-2">
                      {e.contract_name}
                    </div>
                    <NameAndAddress
                      className="justify-start"
                      address={e.contract_id || (e as NFTApproval).id}
                    />
                  </div>
                ) : (
                  <div className="ml-[8px] text-13 font-medium leading-[15px]">
                    {e.symbol}
                  </div>
                )}

                <div className="ml-auto">
                  <img
                    src={
                      selectedList.includes(index)
                        ? IconChecked
                        : IconNotChecked
                    }
                    className="icon icon-checked"
                  />
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <div
        className={clsx(
          'absolute flex flex-col items-center justify-center bg-white left-0 bottom-0 w-full',
          selectedList.length > 1 ? 'h-[115]' : 'h-[84px]'
        )}
      >
        {selectedList.length > 1 && (
          <div className="mb-[16px] text-13 leading-[15px] text-gray-subTitle">
            {selectedList.length} transactions to be signed sequentially
          </div>
        )}
        <Button
          style={{
            width: 172,
            height: 44,
          }}
          type="primary"
          size="large"
          disabled={selectedList.length === 0}
          onClick={handleRevoke}
        >
          Revoke {selectedList.length > 0 ? `(${selectedList.length})` : ''}
        </Button>
      </div>
    </Drawer>
  );
};
