import { NameAndAddress } from '@/ui/component';
import { splitNumberByStep } from '@/ui/utils';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { ReactComponent as BlurArrowDown } from 'ui/assets/approval/arrow-down-blue.svg';
import { TransferingNFTItem } from '@/background/service/openapi';
import NFTAvatar from '../../Dashboard/components/NFT/NFTAvatar';
import clsx from 'clsx';
import IconUnknownNFT from 'ui/assets/unknown-nft.svg';
import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';

export const NFTSignTypedSignHeader = ({
  detail,
}: {
  detail: {
    contract_protocol_logo_url: string;
    action?: string;
    contract_protocol_name: string;
    contract: string;
  };
}) => {
  const { t } = useTranslation();
  const {
    contract,
    contract_protocol_logo_url,
    action = 'Interact with',
    contract_protocol_name,
  } = detail;
  return (
    <div className="tx-action flex items-center gap-[12px] p-[16px]">
      <div>
        <img
          src={contract_protocol_logo_url || IconUnknownProtocol}
          className="w-[40px] h-[40px] rounded-full"
          onError={(e) => (e.currentTarget.src = IconUnknownProtocol)}
        />
      </div>
      <div className="section-card-content">
        <div className="section-card-title">
          {action || t('Unknown Action')}
        </div>
        <div className="section-card-desc flex item-center">
          <span>{contract_protocol_name || t('Unknown Protocol')}</span>
          <NameAndAddress
            className="ml-auto"
            address={contract}
            nameClass="max-90"
            noNameClass="no-name"
          />
        </div>
      </div>
    </div>
  );
};

export const NFTSignTypedSignSection = ({
  typeListNft,
}: {
  typeListNft: any;
}) => {
  const [expand, setExpand] = useState(false);
  const [focusingNFT, setFocusingNFT] = useState<TransferingNFTItem | null>(
    null
  );

  const nftAmount = useMemo(
    () =>
      typeListNft.type_list_nft.offer_list.reduce((sum, nft) => {
        return sum + nft.amount;
      }, 0),
    [typeListNft] || 0
  );
  return (
    <>
      <div className="section-title mt-[32px]">
        This is an NFT listing signature
      </div>
      <div className="bg-white rounded-[6px] p-[16px]">
        <div className="inline-block">
          You are about to list <span>{nftAmount} NFTs</span> with total{' '}
          <span>
            $
            {splitNumberByStep(
              typeListNft?.type_list_nft.total_usd_value || 0 + '',
              2
            )}
          </span>
          {!!typeListNft?.type_list_nft.buyer_list.length && (
            <>
              {' '}
              for specific buyer{' '}
              {typeListNft?.type_list_nft.buyer_list.map((buyer) => {
                return (
                  <NameAndAddress
                    key={buyer.id}
                    className="inline-flex pr-[2px]"
                    address={buyer.id}
                    noNameClass="no-name"
                  />
                );
              })}
            </>
          )}
        </div>

        <div className="bg-gray-bg2 p-[0px] rounded-[6px] max-h-[248px]">
          {typeListNft?.type_list_nft.offer_list.map((e, i, list) => {
            if (!expand && i >= 2) {
              return null;
            }
            return (
              <div
                key={e.nft.id}
                onClick={() => {
                  setFocusingNFT(e.nft as any);
                }}
                className="group relative cursor-pointer  px-[12px] rounded-[4px] border border-transparent hover:border hover:border-blue-light hover:bg-blue-light hover:bg-opacity-[0.2]"
              >
                <div
                  className={clsx(
                    'flex pt-[12px] pb-[16px] border border-transparent group-hover:border-transparent',
                    i !== list.length - 1 && 'border-b-gray-divider'
                  )}
                >
                  <NFTAvatar
                    className="w-[28px] h-[28px]"
                    type={e.nft.content_type as any}
                    content={e.nft?.content}
                    unknown={IconUnknownNFT}
                  />
                  <div className="flex flex-col ml-[8px]">
                    <span className="text-12 font-medium max-w-[266px] text-gray-title whitespace-nowrap overflow-ellipsis overflow-hidden">
                      {e.nft.name}
                    </span>
                    <span className="mt-[2px] text-12 max-w-[266px] text-gray-subTitle whitespace-nowrap overflow-ellipsis overflow-hidden">
                      {e.nft.collection?.name || ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {!expand &&
            typeListNft?.type_list_nft?.offer_list &&
            typeListNft?.type_list_nft?.offer_list.length > 2 && (
              <div
                className="flex items-center justify-center h-[34px] text-13 font-medium text-blue-light text-center"
                onClick={() => setExpand(true)}
              >
                +{(typeListNft?.type_list_nft?.offer_list.length || 2) - 2} NFT{' '}
                <BlurArrowDown />
              </div>
            )}
        </div>
      </div>

      {focusingNFT && (
        <ModalPreviewNFTItem
          nft={focusingNFT}
          onCancel={() => setFocusingNFT(null)}
        />
      )}
    </>
  );
};
