import { NFTApprovalContract } from '@/background/service/openapi';
import { Empty } from '@/ui/component';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconSearch from 'ui/assets/search.svg';
import { Loading } from './Loading';
import NFTContractListItem from './NFTContractListItem';

interface ApprovalCardProps {
  data?: NFTApprovalContract[];
  loading?: boolean;
  onSearch(): void;
  onDecline(item: any): void;
}

const NFTContractList = ({
  data,
  loading,
  onSearch,
  onDecline,
}: ApprovalCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="list">
      <div className="search" onClick={onSearch}>
        <img src={IconSearch} alt="" />
        <div className="placeholder">{t('Search Contracts  / NFTs')}</div>
      </div>
      <div className="list-header">
        <div className="column-title">{t('NFT Contracts')}</div>
        <div className="column-title">{t('Approved to')}</div>
      </div>
      <div className="list-body">
        {loading && <Loading />}

        {!loading && (!data || data.length <= 0) && (
          <Empty className="pt-[80px]">{t('No Approvals')}</Empty>
        )}
        {!loading &&
          data?.map((item) => (
            <NFTContractListItem
              item={item}
              onDecline={onDecline}
              key={item.contract_id}
            />
          ))}
      </div>
    </div>
  );
};

export default NFTContractList;
