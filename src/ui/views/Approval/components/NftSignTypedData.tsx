import { NameAndAddress } from '@/ui/component';
import { splitNumberByStep } from '@/ui/utils';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import {
  ExplainTxResponse,
  TransferingNFTItem,
} from '@/background/service/openapi';
import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import { NFTList } from './TxComponents/ListNFT';

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
  typeListNft: { type_list_nft: ExplainTxResponse['type_list_nft'] };
}) => {
  const [focusingNFT, setFocusingNFT] = useState<TransferingNFTItem | null>(
    null
  );

  const nftAmount = useMemo(
    () =>
      typeListNft?.type_list_nft?.offer_list.reduce((sum, nft) => {
        return sum + nft.amount;
      }, 0),
    [typeListNft] || 0
  );
  return (
    <div className="type-list-nft">
      <div className="section-title mt-[32px]">
        This is an NFT listing signature
      </div>
      <div className="bg-white rounded-[6px] p-[16px]">
        <div className="break-all text-13 leading-[18px] font-normal mb-[8px]">
          You are about to list{' '}
          <span className="font-medium">{nftAmount} NFTs</span> with total{' '}
          <span className="font-medium">
            $
            {splitNumberByStep(
              typeListNft?.type_list_nft?.total_usd_value || 0 + ''
            )}
          </span>
          {!!typeListNft?.type_list_nft?.buyer_list.length && (
            <>
              {' '}
              for specific buyer{' '}
              {typeListNft?.type_list_nft.buyer_list.map((buyer) => {
                return (
                  <NameAndAddress
                    key={buyer.id}
                    className="inline-flex pr-[2px]"
                    address={buyer.id}
                    noNameClass="no-name text-13 leading-[15px] font-medium"
                    copyIconClass="w-[14px] h-[14px]"
                  />
                );
              })}
            </>
          )}
        </div>
        {typeListNft?.type_list_nft?.offer_list && (
          <NFTList list={typeListNft?.type_list_nft?.offer_list} />
        )}
      </div>

      {focusingNFT && (
        <ModalPreviewNFTItem
          nft={focusingNFT}
          onCancel={() => setFocusingNFT(null)}
        />
      )}
    </div>
  );
};
