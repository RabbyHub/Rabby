import { query2obj } from '@/ui/utils/url';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { PageHeader } from 'ui/component';
import { useAddressSource } from 'ui/utils';
import { AddressBackup } from './AddressBackup';
import { AddressDelete } from './AddressDelete';
import { AddressInfo } from './AddressInfo';
import './style.less';

const AddressDetail = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const qs = useMemo(() => query2obj(search), [search]) as {
    address: string;
    type: string;
    brandName: string;
    byImport?: string;
  };

  const { address, type, brandName, byImport } = qs || {};
  const source = useAddressSource({
    type,
    brandName,
    byImport: !!byImport,
  });

  if (!address) {
    return null;
  }

  return (
    <div className="page-address-detail">
      <PageHeader>{t('Address Detail')}</PageHeader>
      <AddressInfo
        address={address}
        type={type}
        brandName={brandName}
        source={source}
      ></AddressInfo>
      <AddressBackup
        address={address}
        type={type}
        brandName={brandName}
      ></AddressBackup>
      <AddressDelete
        address={address}
        type={type}
        brandName={brandName}
        source={source}
      ></AddressDelete>
    </div>
  );
};

export default AddressDetail;
